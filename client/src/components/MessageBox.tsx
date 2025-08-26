import { useEffect, useState } from "react";
import { Alert } from "flowbite-react";

interface Message {
  id: string;
  text: string;
}

interface MessageBoxProps {
  className?: string;
  messages: Message[];
  messageTitle?: string;
  color?: string;
  reduce?: boolean;
  onDismiss?: () => void;
}

export interface MessageHandler {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  pushMessage: (message: Message) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
}

/**
 * Custom hook with basic controls for the state of a message-box.
 * @param initialMessages initial state
 * @returns message handler
 */
export function useMessageHandler(initialMessages: Message[]): MessageHandler {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  return {
    messages,
    setMessages,
    pushMessage: (message) =>
      setMessages((value) => [
        ...value.filter((m) => m.id !== message.id),
        message,
      ]),
    removeMessage: (id: string) =>
      setMessages((value) => value.filter((message) => message.id !== id)),
    clearMessages: () => setMessages([]),
  };
}

export default function MessageBox({
  className,
  messages,
  messageTitle,
  color = "failure",
  reduce = true,
  onDismiss,
}: MessageBoxProps) {
  const [reducedMessages, setReducedMessages] = useState<Message[]>([]);

  // filter duplicate messages if `reduce` is given
  useEffect(() => {
    if (!reduce) {
      setReducedMessages(messages);
      return;
    }
    setReducedMessages(
      messages.reduce(
        (previous, current) =>
          previous.find((m) => m.text === current.text)
            ? previous
            : [...previous, current],
        [] as Message[]
      )
    );
  }, [reduce, messages, setReducedMessages]);

  return (
    <>
      {reducedMessages.length > 0 && (
        <Alert className={className} color={color} onDismiss={onDismiss}>
          <div className="flex flex-col space-y-2">
            <span>{messageTitle}</span>
            {reducedMessages.length === 1 && (
              <span>{reducedMessages[0].text}</span>
            )}
            {reducedMessages.length > 1 && (
              <ul className="pl-5 list-disc">
                {reducedMessages.map((message, index) => (
                  <li key={index}>{message.text}</li>
                ))}
              </ul>
            )}
          </div>
        </Alert>
      )}
    </>
  );
}
