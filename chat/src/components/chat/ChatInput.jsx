import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import { debounce } from "lodash";
import Picker from "emoji-picker-react";

/**
 * Error message component for displaying validation errors
 */
const InputError = React.memo(({ error }) => {
  if (!error) return null;
  
  return (
    <div 
      className="p-2 bg-red-100 dark:bg-red-900/20 border-b border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 text-sm" 
      role="alert"
      aria-live="assertive"
      id="messageInputError"
    >
      {error}
    </div>
  );
});

InputError.propTypes = {
  error: PropTypes.string
};

/**
 * Message input field component with character counter
 */
const MessageInputField = React.memo(({ 
  inputText, 
  onChange, 
  onKeyPress, 
  isConnected, 
  inputRef, 
  hasError 
}) => {
  // Character limit constant
  const MAX_LENGTH = 500;
  
  return (
    <div className="flex-1 relative">
      <label htmlFor="messageInput" className="sr-only">Type a message</label>
      <input
        id="messageInput"
        ref={inputRef}
        type="text"
        value={inputText}
        onChange={onChange}
        onKeyPress={onKeyPress}
        placeholder="Type a message..."
        disabled={!isConnected}
        maxLength={1000} // Hard limit, but we'll show warnings earlier
        aria-describedby={hasError ? "messageInputError" : undefined}
        className="w-full px-4 py-3 border border-gray-200 dark:border-dark-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                  bg-gray-50 dark:bg-dark-bg-input text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-tertiary
                  disabled:bg-gray-100 dark:disabled:bg-dark-bg-hover disabled:cursor-not-allowed shadow-inner transition-all"
      />
      {inputText.length > 0 && (
        <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-xs ${
          inputText.length > 450 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-dark-text-tertiary'
        } transition-colors`}>
          {inputText.length}/{MAX_LENGTH}
        </div>
      )}
    </div>
  );
});

MessageInputField.propTypes = {
  inputText: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func.isRequired,
  isConnected: PropTypes.bool.isRequired,
  inputRef: PropTypes.object.isRequired,
  hasError: PropTypes.bool.isRequired
};

/**
 * Emoji picker component with backdrop
 */
const EmojiPickerControl = React.memo(({ 
  isConnected, 
  showEmojiPicker, 
  setShowEmojiPicker, 
  theme, 
  onEmojiSelect 
}) => {
  return (
    <div className="relative">
      <button
        className="p-3 bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-secondary rounded-full hover:bg-gray-200 dark:hover:bg-dark-bg-active hover:shadow-md transition-all"
        onClick={() => isConnected && setShowEmojiPicker(!showEmojiPicker)}
        disabled={!isConnected}
        aria-label="Insert emoji"
        aria-expanded={showEmojiPicker}
        aria-controls="emojiPicker"
        type="button"
      >
        <span aria-hidden="true" className="text-xl">😀</span>
      </button>
      
      {showEmojiPicker && (
        <>
          {/* Backdrop to close picker when clicking outside */}
          <div 
            className="fixed inset-0 bg-black/5 z-40" 
            onClick={() => setShowEmojiPicker(false)}
          />
          
          {/* Emoji picker with fixed positioning */}
          <div 
            id="emojiPicker"
            className="fixed bottom-20 right-4 z-50 shadow-xl rounded-lg overflow-hidden"
            role="dialog"
            aria-label="Emoji picker"
            style={{ 
              animation: 'fadeIn 0.2s ease-out' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Picker 
              theme={theme === "dark" ? "dark" : "light"} 
              width={320} 
              height={400}
              previewConfig={{
                showPreview: true,
                defaultCaption: 'Select an emoji'
              }}
              searchPlaceHolder="Search emojis..."
              onEmojiClick={onEmojiSelect}
              emojiStyle="native"
              skinTonesDisabled={false}
            />
          </div>
        </>
      )}
    </div>
  );
});

EmojiPickerControl.propTypes = {
  isConnected: PropTypes.bool.isRequired,
  showEmojiPicker: PropTypes.bool.isRequired,
  setShowEmojiPicker: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
  onEmojiSelect: PropTypes.func.isRequired
};

/**
 * Send button component
 */
const SendButton = React.memo(({ 
  onMessageSend, 
  isDisabled 
}) => {
  return (
    <button
      className="px-5 py-3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary-hover hover:to-blue-700 text-white rounded-full transition-all shadow-md hover:shadow-lg
               disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-primary disabled:hover:to-blue-600 flex items-center justify-center"
      onClick={onMessageSend}
      disabled={isDisabled}
      aria-label="Send message"
      type="button"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
      </svg>
      Send
    </button>
  );
});

SendButton.propTypes = {
  onMessageSend: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired
};

/**
 * Main ChatInput Component
 * 
 * A memoized component responsible for handling user input in the chat
 * Implements performance optimizations to prevent UI flickering during typing
 */
const ChatInput = React.memo(({
  inputText,
  setInputText,
  isConnected,
  onMessageSend,
  theme,
  showEmojiPicker, 
  setShowEmojiPicker,
  replyingTo,
  onCancelReply
}) => {
  const [inputError, setInputError] = useState("");
  const editInputRef = useRef(null);
  
  // Character limit constants
  const WARNING_THRESHOLD = 450;
  const MAX_LENGTH = 500;
  
  // Focus input when component mounts or when replying
  useEffect(() => {
    if (editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [replyingTo]);

  // Debounced error setter to prevent rapid UI updates
  const debouncedSetError = useMemo(
    () => debounce((error) => {
      setInputError(error);
    }, 200), // 200ms debounce for error messages
    []
  );

  // Handle input changes with validation
  const handleInputChange = useCallback((e) => {
    const newText = e.target.value;
    
    // Update parent state directly for better responsiveness
    setInputText(newText);
    
    // Length validation with debounced error messages
    if (newText.length > WARNING_THRESHOLD && newText.length <= MAX_LENGTH) {
      debouncedSetError(`${MAX_LENGTH - newText.length} characters remaining`);
    } else if (newText.length > MAX_LENGTH) {
      debouncedSetError(`Message is too long (${newText.length}/${MAX_LENGTH} characters)`);
    } else if (inputError) {
      debouncedSetError("");
    }
  }, [setInputText, debouncedSetError, inputError]);

  // Handle Enter key press to send messages
  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey && inputText.trim() && isConnected) {
        e.preventDefault();
        onMessageSend();
      }
    },
    [onMessageSend, inputText, isConnected]
  );

  // Handle emoji selection
  const handleEmojiSelect = useCallback(
    (emoji) => {
      const newText = inputText + emoji.emoji;
      setInputText(newText);
      
      // Close emoji picker after selection
      setShowEmojiPicker(false);
      
      // Focus back on input
      if (editInputRef.current) {
        editInputRef.current.focus();
      }
    },
    [inputText, setInputText, setShowEmojiPicker]
  );

  return (
    <div className="bg-white dark:bg-dark-bg-secondary shadow-lg rounded-lg overflow-hidden transition-colors duration-300 border border-gray-100 dark:border-dark-border-primary">
      {/* Error message component */}
      <InputError error={inputError} />
      
      <div className="flex items-center p-4 space-x-3">
        {/* Message input field */}
        <MessageInputField
          inputText={inputText}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          isConnected={isConnected}
          inputRef={editInputRef}
          hasError={!!inputError}
        />
        
        {/* Emoji picker */}
        <EmojiPickerControl
          isConnected={isConnected}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          theme={theme}
          onEmojiSelect={handleEmojiSelect}
        />
        
        {/* Send button */}
        <SendButton
          onMessageSend={onMessageSend}
          isDisabled={!isConnected || !inputText.trim()}
        />
      </div>
    </div>
  );
});

ChatInput.propTypes = {
  inputText: PropTypes.string.isRequired,
  setInputText: PropTypes.func.isRequired,
  isConnected: PropTypes.bool.isRequired,
  onMessageSend: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
  showEmojiPicker: PropTypes.bool.isRequired,
  setShowEmojiPicker: PropTypes.func.isRequired,
  replyingTo: PropTypes.object,
  onCancelReply: PropTypes.func
};

ChatInput.displayName = 'ChatInput';

export default ChatInput;
