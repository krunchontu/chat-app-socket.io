import { createContext, useContext, useReducer, useEffect } from "react";
import socketIo from "socket.io-client";

const ENDPOINT = "http://localhost:4500/";

const ChatContext = createContext();

const chatReducer = (state, action) => {
  switch (action.type) {
    case "SET_CONNECTION_STATUS":
      return { ...state, isConnected: action.payload };
    case "ADD_MESSAGE":
      // Avoid duplicate messages
      if (state.messages.some(msg => msg.id === action.payload.id)) {
        return state;
      }
      return { ...state, messages: [...state.messages, action.payload] };
    case "UPDATE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id ? { ...msg, likes: action.payload.likes } : msg
        )
      };
    case "SET_SOCKET":
      return { ...state, socket: action.payload };
    default:
      return state;
  }
};

export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, {
    messages: [],
    isConnected: false,
    socket: null
  });

  useEffect(() => {
    const socket = socketIo(ENDPOINT, { transports: ["websocket"] });
    
    socket.on("connect", () => {
      dispatch({ type: "SET_CONNECTION_STATUS", payload: true });
    });

    socket.on("disconnect", () => {
      dispatch({ type: "SET_CONNECTION_STATUS", payload: false });
    });

    socket.on("sendMessage", (data) => {
      dispatch({ type: "ADD_MESSAGE", payload: data });
    });

    dispatch({ type: "SET_SOCKET", payload: socket });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
