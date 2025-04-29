import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageActions from './MessageActions';
import { ChatProvider } from '../../context/ChatContext';
import { AuthProvider } from '../common/AuthContext';

// Mock functions for chat context
const mockEditMessage = jest.fn().mockResolvedValue(true);
const mockDeleteMessage = jest.fn().mockResolvedValue(true);
const mockToggleReaction = jest.fn().mockResolvedValue(true);

// Mock useChat hook
jest.mock('../../context/ChatContext', () => ({
  useChat: () => ({
    editMessage: mockEditMessage,
    deleteMessage: mockDeleteMessage,
    toggleReaction: mockToggleReaction
  }),
  ChatProvider: ({ children }) => <div>{children}</div>
}));

// Mock window.confirm
const originalConfirm = window.confirm;

describe('MessageActions Component', () => {
  const currentUser = { username: 'testuser', id: 'user1' };
  const ownMessage = { 
    id: 'msg1', 
    text: 'Hello World', 
    user: 'testuser',
    reactions: { 
      '👍': ['user2'], 
      '❤️': ['user1', 'user2'] 
    }
  };
  
  const otherUserMessage = { 
    id: 'msg2', 
    text: 'How are you?', 
    user: 'otheruser',
    reactions: {}
  };
  
  // Mock onReply function
  const mockOnReply = jest.fn();
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock window.confirm to always return true
    window.confirm = jest.fn().mockReturnValue(true);
  });
  
  afterEach(() => {
    // Restore original window.confirm
    window.confirm = originalConfirm;
  });
  
  it('renders basic message actions for any message', async () => {
    render(
      <AuthProvider value={{ user: currentUser }}>
        <MessageActions 
          message={otherUserMessage} 
          onReply={mockOnReply} 
        />
      </AuthProvider>
    );
    
    // Should render reply button for any message
    expect(screen.getByLabelText('Reply to this message')).toBeInTheDocument();
    
    // Should render reaction button for any message
    expect(screen.getByLabelText('Add reaction')).toBeInTheDocument();
    
    // More actions button should NOT be present for other user's messages
    expect(screen.queryByLabelText('More actions')).not.toBeInTheDocument();
  });
  
  it('renders edit and delete buttons for own messages', async () => {
    render(
      <AuthProvider value={{ user: currentUser }}>
        <MessageActions 
          message={ownMessage} 
          onReply={mockOnReply} 
        />
      </AuthProvider>
    );
    
    // More actions button should be present for own messages
    const moreActionsButton = screen.getByLabelText('More actions');
    expect(moreActionsButton).toBeInTheDocument();
    
    // Click more actions button to show edit and delete options
    await userEvent.click(moreActionsButton);
    
    // Edit and delete buttons should be present
    expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
  });
  
  it('calls onReply when reply button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider value={{ user: currentUser }}>
        <MessageActions 
          message={ownMessage} 
          onReply={mockOnReply} 
        />
      </AuthProvider>
    );
    
    // Click reply button
    const replyButton = screen.getByLabelText('Reply to this message');
    await user.click(replyButton);
    
    // onReply should be called with the message
    expect(mockOnReply).toHaveBeenCalledWith(ownMessage);
  });
  
  it('enters edit mode when edit button is clicked', async () => {
    render(
      <AuthProvider value={{ user: currentUser }}>
        <MessageActions 
          message={ownMessage} 
          onReply={mockOnReply} 
        />
      </AuthProvider>
    );
    
    // Click more actions button
    const moreActionsButton = screen.getByLabelText('More actions');
    await userEvent.click(moreActionsButton);
    
    // Click edit button
    const editButton = screen.getByRole('menuitem', { name: /edit/i });
    await userEvent.click(editButton);
    
    // Should enter edit mode with textarea and save/cancel buttons
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
  
  it('calls editMessage when save is clicked in edit mode', async () => {
    render(
      <AuthProvider value={{ user: currentUser }}>
        <MessageActions 
          message={ownMessage} 
          onReply={mockOnReply} 
        />
      </AuthProvider>
    );
    
    // Click more actions button
    const moreActionsButton = screen.getByLabelText('More actions');
    await userEvent.click(moreActionsButton);
    
    // Click edit button
    const editButton = screen.getByRole('menuitem', { name: /edit/i });
    await userEvent.click(editButton);
    
    // Edit message
    const textarea = screen.getByRole('textbox');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Updated message');
    
    // Click save button
    const saveButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);
    
    // editMessage should be called with id and new text
    expect(mockEditMessage).toHaveBeenCalledWith('msg1', 'Updated message');
  });
  
  it('cancels edit mode when cancel is clicked', async () => {
    render(
      <AuthProvider value={{ user: currentUser }}>
        <MessageActions 
          message={ownMessage} 
          onReply={mockOnReply} 
        />
      </AuthProvider>
    );
    
    // Click more actions button
    const moreActionsButton = screen.getByLabelText('More actions');
    await userEvent.click(moreActionsButton);
    
    // Click edit button
    const editButton = screen.getByRole('menuitem', { name: /edit/i });
    await userEvent.click(editButton);
    
    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelButton);
    
    // Should exit edit mode, message actions should be visible again
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Reply to this message')).toBeInTheDocument();
  });
  
  it('confirms before deleting a message', async () => {
    render(
      <AuthProvider value={{ user: currentUser }}>
        <MessageActions 
          message={ownMessage} 
          onReply={mockOnReply} 
        />
      </AuthProvider>
    );
    
    // Click more actions button
    const moreActionsButton = screen.getByLabelText('More actions');
    await userEvent.click(moreActionsButton);
    
    // Click delete button
    const deleteButton = screen.getByRole('menuitem', { name: /delete/i });
    await userEvent.click(deleteButton);
    
    // Confirm dialog should be shown
    expect(window.confirm).toHaveBeenCalled();
    
    // deleteMessage should be called with id
    expect(mockDeleteMessage).toHaveBeenCalledWith('msg1');
  });
  
  it('does not delete when confirmation is cancelled', async () => {
    // Mock window.confirm to return false
    window.confirm.mockReturnValueOnce(false);
    
    render(
      <AuthProvider value={{ user: currentUser }}>
        <MessageActions 
          message={ownMessage} 
          onReply={mockOnReply} 
        />
      </AuthProvider>
    );
    
    // Click more actions button
    const moreActionsButton = screen.getByLabelText('More actions');
    await userEvent.click(moreActionsButton);
    
    // Click delete button
    const deleteButton = screen.getByRole('menuitem', { name: /delete/i });
    await userEvent.click(deleteButton);
    
    // Confirm dialog should be shown
    expect(window.confirm).toHaveBeenCalled();
    
    // deleteMessage should NOT be called
    expect(mockDeleteMessage).not.toHaveBeenCalled();
  });
  
  it('shows reactions menu when reaction button is clicked', async () => {
    render(
      <AuthProvider value={{ user: currentUser }}>
        <MessageActions 
          message={ownMessage} 
          onReply={mockOnReply} 
        />
      </AuthProvider>
    );
    
    // Click reaction button
    const reactionButton = screen.getByLabelText('Add reaction');
    await userEvent.click(reactionButton);
    
    // Reactions menu should be visible
    expect(screen.getByRole('menu')).toBeInTheDocument();
    
    // Should show available reactions
    expect(screen.getByLabelText('React with 👍')).toBeInTheDocument();
    expect(screen.getByLabelText('React with ❤️')).toBeInTheDocument();
  });
  
  it('calls toggleReaction when a reaction is clicked', async () => {
    render(
      <AuthProvider value={{ user: currentUser }}>
        <MessageActions 
          message={ownMessage} 
          onReply={mockOnReply} 
        />
      </AuthProvider>
    );
    
    // Click reaction button
    const reactionButton = screen.getByLabelText('Add reaction');
    await userEvent.click(reactionButton);
    
    // Click a reaction
    const thumbsUpReaction = screen.getByLabelText('React with 👍');
    await userEvent.click(thumbsUpReaction);
    
    // toggleReaction should be called with id and emoji
    expect(mockToggleReaction).toHaveBeenCalledWith('msg1', '👍');
  });
  
  it('displays existing reactions with counts', async () => {
    render(
      <AuthProvider value={{ user: currentUser }}>
        <MessageActions 
          message={ownMessage} 
          onReply={mockOnReply} 
        />
      </AuthProvider>
    );
    
    // Reaction badges should be displayed for existing reactions
    const reactionBadges = screen.getAllByRole('button', { 
      name: /reaction:/i 
    });
    
    // Should have 2 reaction badges (👍 and ❤️)
    expect(reactionBadges.length).toBe(2);
    
    // Check reaction counts
    const thumbsUpBadge = screen.getByLabelText('👍 reaction: 1');
    expect(thumbsUpBadge).toBeInTheDocument();
    
    const heartBadge = screen.getByLabelText('❤️ reaction: 2');
    expect(heartBadge).toBeInTheDocument();
  });
  
  it('highlights reactions that the current user has added', async () => {
    render(
      <AuthProvider value={{ user: currentUser }}>
        <MessageActions 
          message={ownMessage} 
          onReply={mockOnReply} 
        />
      </AuthProvider>
    );
    
    // ❤️ reaction has user1 (current user) in its users array
    const heartBadge = screen.getByLabelText('❤️ reaction: 2');
    
    // Should have 'reacted' class
    expect(heartBadge).toHaveClass('reacted');
    
    // 👍 reaction doesn't have user1 in its users array
    const thumbsUpBadge = screen.getByLabelText('👍 reaction: 1');
    
    // Should not have 'reacted' class
    expect(thumbsUpBadge).not.toHaveClass('reacted');
  });
});
