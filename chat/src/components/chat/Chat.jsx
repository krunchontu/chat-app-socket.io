import React, { useState } from "react";
import { useChat } from "../../context/ChatContext";
import Picker from "emoji-picker-react";
import "./Chat.css";

const userList = ["Alan", "Bob", "Carol", "Dean", "Elin"];

const ChatApp = () => {
  const { state, dispatch } = useChat();
  const messages = state.messages;
  const [inputText, setInputText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const handleMessageSend = () => {
    if (inputText.trim() !== "") {
      const randomUser = userList[Math.floor(Math.random() * userList.length)];
      const newMessage = {
        id: Date.now(), // Unique identifier for the message
        user: randomUser,
        text: inputText,
        likes: 0, // Initialize likes count to 0
      };
      state.socket.emit("message", newMessage);
      setInputText("");
    }
  };


  const handleLike = (id) => {
    const updatedLikes = messages.find((message) => message.id === id).likes + 1;
    dispatch({
      type: "UPDATE_MESSAGE",
      payload: { id, likes: updatedLikes }
    });
    state.socket.emit("like", { id, likes: updatedLikes });
  };

  const handleEmojiSelect = (emoji) => {
    setInputText(inputText + emoji.emoji); // Use emoji.emoji to get the selected emoji
  };
  return (
    <div className="chat-container">
      <div className="chat-thread">
        {messages
          .slice(0)
          .reverse()
          .map((message, index) => (
            <div key={index} className="chat-message">
              <div className="chat-circle">
                <span className="chat-circle-letter">{message.user[0]}</span>
                <span className="chat-circle-letter">
                  {message.user.slice(-1)}
                </span>
              </div>
              <span>
                {message.user}: {message.text}
              </span>
              <button
                className="like-button"
                onClick={() => handleLike(message.id)}
              >
                Like {message.likes}
              </button>
            </div>
          ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
        />
        <div
          className="emoji" // Relative positioning for emoji picker button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          😀
        </div>
        {showEmojiPicker && (
          <div className="emoji-picker-react">
            {" "}
            <Picker theme="dark" width={345} onEmojiClick={handleEmojiSelect} />
          </div>
        )}
        <button className="send-btn" onClick={handleMessageSend}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatApp;
