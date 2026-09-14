import React from 'react';

export interface AIMessageBubbleProps {
  message: string;
  isUser?: boolean;
}

export const AIMessageBubble: React.FC<AIMessageBubbleProps> = ({ message, isUser = false }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xl p-4 rounded-2xl text-sm leading-relaxed ${
        isUser
          ? 'bg-primary-navy text-on-primary rounded-br-none'
          : 'bg-surface border border-border text-text-primary rounded-bl-none shadow-sm'
      }`}>
        {message}
      </div>
    </div>
  );
};

export default AIMessageBubble;
