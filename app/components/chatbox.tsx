import { useRef, useEffect } from "react";
import type { ChatMessage } from "~/routes/home";

const ChatBox = ({ messages }: { messages: ChatMessage[] }) => {
    const chatbox = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (chatbox.current && chatbox.current.scrollHeight - chatbox.current.scrollTop <= chatbox.current.clientHeight + 250) {
            chatbox.current.scrollTop = chatbox.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="h-[50vh] w-[50vw] my-5 overflow-y-auto p-4 bg-gray-600 border rounded" ref={chatbox}>
            {messages.map((msg, index) => (
                <div key={index} className=" text-white p-2 rounded mb-2">
                    <strong style={{ color: msg.colour }}>{msg.username}</strong>: {msg.message}
                </div>
            ))}
        </div>
    );
};

export default ChatBox;