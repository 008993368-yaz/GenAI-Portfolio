"""Shared pytest fixtures for backend unit tests."""

import types
import sys
from pathlib import Path

import pytest

# Ensure imports like `from app...` and `from scripts...` work under pytest
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _ensure_module(name: str):
    module = sys.modules.get(name)
    if module is None:
        module = types.ModuleType(name)
        sys.modules[name] = module
    return module


def _install_dependency_stubs() -> None:
    """Install lightweight stubs for optional dependencies used by unit-tested modules."""
    for pkg in [
        "langchain",
        "langchain_community",
        "langchain.chains",
        "langchain.chains.combine_documents",
        "langchain_core",
        "langchain.embeddings",
    ]:
        _ensure_module(pkg)

    # langchain.schema stubs
    schema_mod = _ensure_module("langchain.schema")

    class BaseMessage:
        def __init__(self, content: str):
            self.content = content

    class HumanMessage(BaseMessage):
        pass

    class AIMessage(BaseMessage):
        pass

    schema_mod.BaseMessage = BaseMessage
    schema_mod.HumanMessage = HumanMessage
    schema_mod.AIMessage = AIMessage

    # langchain.memory stub
    memory_mod = _ensure_module("langchain.memory")

    class _ChatMemory:
        def __init__(self):
            self.messages = []

        def add_user_message(self, content: str):
            self.messages.append(HumanMessage(content=content))

        def add_ai_message(self, content: str):
            self.messages.append(AIMessage(content=content))

        def clear(self):
            self.messages.clear()

    class ConversationBufferWindowMemory:
        def __init__(self, k=5, return_messages=True, memory_key="chat_history"):
            self.k = k
            self.return_messages = return_messages
            self.memory_key = memory_key
            self.chat_memory = _ChatMemory()

        def clear(self):
            self.chat_memory.clear()

    memory_mod.ConversationBufferWindowMemory = ConversationBufferWindowMemory

    # langchain.embeddings.base stub
    embeddings_base_mod = _ensure_module("langchain.embeddings.base")

    class Embeddings:  # pragma: no cover - marker base class for imports
        pass

    embeddings_base_mod.Embeddings = Embeddings

    # pinecone and vectorstore stubs
    pinecone_mod = _ensure_module("pinecone")

    class Pinecone:
        def __init__(self, *args, **kwargs):
            self.inference = types.SimpleNamespace(embed=lambda **_: [])

        def list_indexes(self):
            return []

        def create_index(self, **kwargs):
            return None

        def Index(self, name):
            return types.SimpleNamespace(upsert=lambda **_: None)

    class ServerlessSpec:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    pinecone_mod.Pinecone = Pinecone
    pinecone_mod.ServerlessSpec = ServerlessSpec

    lcp_mod = _ensure_module("langchain_pinecone")

    class PineconeVectorStore:
        def __init__(self, *args, **kwargs):
            self.search_kwargs = {"k": 5}

        def as_retriever(self, search_kwargs=None):
            return types.SimpleNamespace(search_kwargs=search_kwargs or {"k": 5}, invoke=lambda _: [])

        def similarity_search_with_score(self, query, k=5):
            return []

    lcp_mod.PineconeVectorStore = PineconeVectorStore

    # langchain prompt/chain/output parser stubs used by rag imports
    prompt_mod = _ensure_module("langchain.prompts")

    class MessagesPlaceholder:
        def __init__(self, variable_name=None, optional=False):
            self.variable_name = variable_name
            self.optional = optional

    class ChatPromptTemplate:
        @classmethod
        def from_messages(cls, messages):
            return cls()

        def __or__(self, other):
            return self

    prompt_mod.MessagesPlaceholder = MessagesPlaceholder
    prompt_mod.ChatPromptTemplate = ChatPromptTemplate

    chains_mod = _ensure_module("langchain.chains")
    chains_mod.create_retrieval_chain = lambda retriever, combine_docs_chain: types.SimpleNamespace(invoke=lambda payload: {"answer": "stub"})

    combine_mod = _ensure_module("langchain.chains.combine_documents")
    combine_mod.create_stuff_documents_chain = lambda llm, prompt: object()

    output_mod = _ensure_module("langchain_core.output_parsers")

    class JsonOutputParser:
        def __init__(self, pydantic_object=None):
            self.pydantic_object = pydantic_object

        def get_format_instructions(self):
            return "{}"

    output_mod.JsonOutputParser = JsonOutputParser

    # langchain openai wrapper stub
    lco_mod = _ensure_module("langchain_openai")

    class ChatOpenAI:
        def __init__(self, *args, **kwargs):
            pass

    lco_mod.ChatOpenAI = ChatOpenAI

    # ingestion stubs
    loader_mod = _ensure_module("langchain_community.document_loaders")

    class PyPDFLoader:
        def __init__(self, path):
            self.path = path

        def load(self):
            return []

    loader_mod.PyPDFLoader = PyPDFLoader

    splitter_mod = _ensure_module("langchain_text_splitters")

    class RecursiveCharacterTextSplitter:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

        def split_documents(self, pages):
            return []

    splitter_mod.RecursiveCharacterTextSplitter = RecursiveCharacterTextSplitter

    # openai exception stubs
    openai_mod = _ensure_module("openai")

    class APITimeoutError(Exception):
        pass

    class APIConnectionError(Exception):
        pass

    class RateLimitError(Exception):
        pass

    openai_mod.APITimeoutError = APITimeoutError
    openai_mod.APIConnectionError = APIConnectionError
    openai_mod.RateLimitError = RateLimitError


_install_dependency_stubs()


@pytest.fixture
def sample_session_id() -> str:
    return "test-session-001"


@pytest.fixture
def session_memory():
    """Create a short-lived SessionMemory instance for deterministic tests."""
    from app.services.memory import SessionMemory

    memory = SessionMemory(
        max_messages_per_session=6,
        session_ttl_seconds=1,
        cleanup_interval_seconds=3600,
    )

    yield memory

    # Gracefully stop the background cleanup thread so tests exit cleanly
    memory._stop_event.set()  # pylint: disable=protected-access
    memory._cleanup_thread.join(timeout=1)  # pylint: disable=protected-access
