/**
 * Chatbot Loading Skeleton
 * Displays a shimmer animation while the chatbot component is being loaded
 * Provides visual feedback and improves perceived performance
 */
const ChatbotSkeleton = () => {
  return (
    <div className="chatbot-skeleton-wrapper">
      <div className="chatbot-skeleton-button">
        <div className="skeleton-shimmer"></div>
      </div>
    </div>
  );
};

export default ChatbotSkeleton;
