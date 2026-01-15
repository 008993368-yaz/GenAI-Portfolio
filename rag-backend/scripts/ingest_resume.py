#!/usr/bin/env python3
"""
RAG Ingestion Script for Portfolio Chatbot
Loads resume PDF, chunks it, and upserts to Pinecone (embeddings handled by Pinecone inference)
"""

import os
import sys
import hashlib
from pathlib import Path
from typing import List, Dict, Any
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pinecone import Pinecone, ServerlessSpec


def load_environment():
    """Load and validate environment variables"""
    load_dotenv()
    
    required_vars = {
        "PINECONE_API_KEY": os.getenv("PINECONE_API_KEY"),
        "PINECONE_INDEX_NAME": os.getenv("PINECONE_INDEX_NAME"),
    }
    
    missing = [k for k, v in required_vars.items() if not v]
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
    
    return {
        **required_vars,
        "PINECONE_NAMESPACE": os.getenv("PINECONE_NAMESPACE", "resume-v1")
    }


def deterministic_id(text: str, chunk_index: int, source: str) -> str:
    """
    Generate deterministic ID for a chunk
    This ensures re-running the script overwrites the same vectors (idempotent)
    """
    content = f"{source}::{chunk_index}::{text[:100]}"
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def load_and_chunk_pdf(pdf_path: Path, chunk_size: int = 600, chunk_overlap: int = 100) -> List[Dict[str, Any]]:
    """
    Load PDF and split into chunks with metadata
    
    Args:
        pdf_path: Path to resume PDF
        chunk_size: Target chunk size in characters (roughly 500-800 tokens)
        chunk_overlap: Overlap between chunks
    
    Returns:
        List of dicts with 'id', 'text', and 'metadata'
    """
    print(f"📄 Loading PDF: {pdf_path}")
    loader = PyPDFLoader(str(pdf_path))
    pages = loader.load()
    
    print(f"✅ Loaded {len(pages)} pages")
    
    # Configure text splitter
    # chunk_size=600 chars ≈ 500-800 tokens depending on content
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    
    # Split documents
    splits = text_splitter.split_documents(pages)
    print(f"✂️  Created {len(splits)} chunks")
    
    # Prepare chunks with metadata
    chunks = []
    for idx, doc in enumerate(splits):
        chunk_id = deterministic_id(
            text=doc.page_content,
            chunk_index=idx,
            source=pdf_path.stem
        )
        
        metadata = {
            "source": "resume",
            "filename": pdf_path.name,
            "chunk_index": idx,
            "text_preview": doc.page_content[:100] + "..." if len(doc.page_content) > 100 else doc.page_content,
        }
        
        # Add page number if available
        if "page" in doc.metadata:
            metadata["page"] = doc.metadata["page"]
        
        chunks.append({
            "id": chunk_id,
            "text": doc.page_content,
            "metadata": metadata
        })
    
    return chunks


def initialize_pinecone(config: Dict[str, str]):
    """Initialize Pinecone client and ensure index exists"""
    print(f"🌲 Connecting to Pinecone...")
    
    pc = Pinecone(api_key=config["PINECONE_API_KEY"])
    index_name = config["PINECONE_INDEX_NAME"]
    
    # Check if index exists, create if not
    existing_indexes = [idx['name'] for idx in pc.list_indexes()]
    
    if index_name not in existing_indexes:
        print(f"⚠️  Index '{index_name}' not found. Creating new index...")
        pc.create_index(
            name=index_name,
            dimension=1024,  # llama-text-embed-v2 dimension
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
        print(f"✅ Created index: {index_name}")
    else:
        print(f"✅ Using existing index: {index_name}")
    
    return pc.Index(index_name), pc


def embed_and_upsert(chunks: List[Dict[str, Any]], index, pc_client, namespace: str, batch_size: int = 100):
    """
    Embed and upsert chunks to Pinecone in batches using Pinecone inference
    
    Args:
        chunks: List of chunk dicts with id, text, metadata
        index: Pinecone index
        pc_client: Pinecone client for inference
        namespace: Pinecone namespace
        batch_size: Number of vectors per batch
    """
    print(f"🔄 Embedding and upserting {len(chunks)} chunks to namespace '{namespace}' (using llama-text-embed-v2)...")
    
    # Process in batches
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        
        # Generate embeddings using Pinecone inference
        # Pass text strings directly
        texts = [chunk["text"] for chunk in batch]
        embeddings = pc_client.inference.embed(
            model="llama-text-embed-v2",
            inputs=texts,
            parameters={"input_type": "passage"}
        )
        
        # Prepare upsert data with embeddings
        upsert_data = [
            {
                "id": chunk["id"],
                "values": embedding['values'],
                "metadata": {
                    **chunk["metadata"],
                    "text": chunk["text"]  # Store full text in metadata for retrieval
                }
            }
            for chunk, embedding in zip(batch, embeddings)
        ]
        
        # Upsert to Pinecone
        index.upsert(vectors=upsert_data, namespace=namespace)
        
        print(f"  ✓ Upserted batch {i // batch_size + 1}/{(len(chunks) - 1) // batch_size + 1}")
    
    print(f"✅ Successfully upserted {len(chunks)} vectors")


def print_summary(chunks: List[Dict[str, Any]], pages_count: int):
    """Print ingestion summary"""
    print("\n" + "="*60)
    print("📊 INGESTION SUMMARY")
    print("="*60)
    print(f"📄 Pages processed:    {pages_count}")
    print(f"✂️  Chunks created:     {len(chunks)}")
    print(f"☁️  Vectors upserted:   {len(chunks)}")
    print(f"🔑 ID strategy:        Deterministic (idempotent)")
    print("="*60)
    print("\n✨ Ingestion complete! Your resume is now searchable.")


def main():
    """Main ingestion pipeline"""
    try:
        # Load environment
        config = load_environment()
        print("✅ Environment variables loaded")
        
        # Find resume PDF
        pdf_path = Path(__file__).parent.parent / "data" / "Resume_essay.pdf"
        if not pdf_path.exists():
            raise FileNotFoundError(
                f"Resume PDF not found at: {pdf_path}\n"
                f"Please place your Resume_essay.pdf in the data/ directory"
            )
        
        # Load and chunk PDF
        chunks = load_and_chunk_pdf(pdf_path)
        pages_count = len(chunks) // 5 if chunks else 0  # Rough estimate
        
        # Initialize Pinecone
        index, pc = initialize_pinecone(config)
        
        # Embed and upsert chunks using Pinecone inference
        embed_and_upsert(
            chunks=chunks,
            index=index,
            pc_client=pc,
            namespace=config["PINECONE_NAMESPACE"]
        )
        
        # Print summary
        print_summary(chunks, len(chunks))
        
    except Exception as e:
        print(f"\n❌ Error during ingestion: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
