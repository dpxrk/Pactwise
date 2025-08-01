import { render, screen, waitFor } from '../../test-utils';
import { ChatInterface } from '@/app/_components/ai/ChatInterface';
import { useAction, useMutation } from 'convex/react';
import userEvent from '@testing-library/user-event';

jest.mock('convex/react', () => ({
  ...jest.requireActual('convex/react'),
  useAction: jest.fn(),
  useMutation: jest.fn(),
}));

const mockMessages = [
  {
    _id: 'msg-1',
    _creationTime: Date.now() - 60000,
    role: 'user',
    content: 'What are my upcoming contract renewals?',
    timestamp: new Date(Date.now() - 60000).toISOString(),
  },
  {
    _id: 'msg-2',
    _creationTime: Date.now() - 30000,
    role: 'assistant',
    content: 'You have 3 contracts up for renewal in the next 30 days:\n1. Software License - Tech Corp\n2. Maintenance Agreement - Service Pro\n3. Cloud Services - CloudNet',
    timestamp: new Date(Date.now() - 30000).toISOString(),
  },
];

describe('ChatInterface', () => {
  const mockSendMessage = jest.fn();
  const mockClearHistory = jest.fn();
  const mockGenerateInsights = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAction as jest.Mock).mockReturnValue(mockGenerateInsights);
    (useMutation as jest.Mock).mockImplementation((path) => {
      if (path === 'api.ai.chat.sendMessage') return mockSendMessage;
      if (path === 'api.ai.chat.clearHistory') return mockClearHistory;
      return jest.fn();
    });
  });

  it('renders chat interface with message history', () => {
    render(<ChatInterface messages={mockMessages} />);

    expect(screen.getByText('What are my upcoming contract renewals?')).toBeInTheDocument();
    expect(screen.getByText(/You have 3 contracts up for renewal/)).toBeInTheDocument();
  });

  it('displays message timestamps', () => {
    render(<ChatInterface messages={mockMessages} />);

    const timestamps = screen.getAllByTestId(/timestamp/);
    expect(timestamps).toHaveLength(2);
  });

  it('sends a new message', async () => {
    mockSendMessage.mockResolvedValue({
      _id: 'msg-3',
      role: 'assistant',
      content: 'I can help with that.',
    });

    render(<ChatInterface messages={mockMessages} />);

    const input = screen.getByPlaceholderText(/Ask about your contracts/i);
    await user.type(input, 'Show me expired contracts');
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith({
        message: 'Show me expired contracts',
        context: expect.any(Object),
      });
    });

    // Input should be cleared
    expect(input).toHaveValue('');
  });

  it('prevents sending empty messages', async () => {
    render(<ChatInterface messages={mockMessages} />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('shows typing indicator while waiting for response', async () => {
    mockSendMessage.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<ChatInterface messages={mockMessages} />);

    const input = screen.getByPlaceholderText(/Ask about your contracts/i);
    await user.type(input, 'Test message');
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });

  it('handles message send errors gracefully', async () => {
    mockSendMessage.mockRejectedValue(new Error('Failed to send message'));

    render(<ChatInterface messages={mockMessages} />);

    const input = screen.getByPlaceholderText(/Ask about your contracts/i);
    await user.type(input, 'Test message');
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to send message/i)).toBeInTheDocument();
    });
  });

  it('clears chat history', async () => {
    window.confirm = jest.fn(() => true);

    render(<ChatInterface messages={mockMessages} />);

    const clearButton = screen.getByRole('button', { name: /clear chat/i });
    await user.click(clearButton);

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to clear the chat history?'
    );
    expect(mockClearHistory).toHaveBeenCalled();
  });

  it('cancels clearing chat history when not confirmed', async () => {
    window.confirm = jest.fn(() => false);

    render(<ChatInterface messages={mockMessages} />);

    const clearButton = screen.getByRole('button', { name: /clear chat/i });
    await user.click(clearButton);

    expect(mockClearHistory).not.toHaveBeenCalled();
  });

  it('displays suggested prompts when no messages', () => {
    render(<ChatInterface messages={[]} />);

    expect(screen.getByText(/What contracts expire this month/i)).toBeInTheDocument();
    expect(screen.getByText(/Show vendor performance/i)).toBeInTheDocument();
    expect(screen.getByText(/Analyze contract spending/i)).toBeInTheDocument();
  });

  it('uses suggested prompt when clicked', async () => {
    render(<ChatInterface messages={[]} />);

    const suggestedPrompt = screen.getByText(/What contracts expire this month/i);
    await user.click(suggestedPrompt);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith({
        message: expect.stringContaining('expire this month'),
        context: expect.any(Object),
      });
    });
  });

  it('handles keyboard shortcuts', async () => {
    render(<ChatInterface messages={mockMessages} />);

    const input = screen.getByPlaceholderText(/Ask about your contracts/i);
    await user.type(input, 'Test message');
    
    // Press Enter to send
    await user.keyboard('{Enter}');

    expect(mockSendMessage).toHaveBeenCalled();
  });

  it('supports Shift+Enter for new lines', async () => {
    render(<ChatInterface messages={mockMessages} />);

    const input = screen.getByPlaceholderText(/Ask about your contracts/i);
    await user.type(input, 'Line 1');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(input, 'Line 2');

    expect(input).toHaveValue('Line 1\nLine 2');
  });

  it('generates AI insights', async () => {
    mockGenerateInsights.mockResolvedValue({
      insights: ['Contract spending increased 15%', 'Vendor consolidation opportunity'],
    });

    render(<ChatInterface messages={mockMessages} />);

    const insightsButton = screen.getByRole('button', { name: /generate insights/i });
    await user.click(insightsButton);

    await waitFor(() => {
      expect(mockGenerateInsights).toHaveBeenCalled();
      expect(screen.getByText(/Contract spending increased 15%/)).toBeInTheDocument();
    });
  });

  it('formats code blocks in responses', () => {
    const codeMessage = {
      _id: 'msg-code',
      _creationTime: Date.now(),
      role: 'assistant',
      content: 'Here is the query:\n```sql\nSELECT * FROM contracts WHERE status = "active";\n```',
      timestamp: new Date().toISOString(),
    };

    render(<ChatInterface messages={[codeMessage]} />);

    const codeBlock = screen.getByTestId('code-block');
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock).toHaveClass('language-sql');
  });

  it('handles markdown formatting', () => {
    const markdownMessage = {
      _id: 'msg-md',
      _creationTime: Date.now(),
      role: 'assistant',
      content: '**Bold text** and *italic text* with a [link](https://example.com)',
      timestamp: new Date().toISOString(),
    };

    render(<ChatInterface messages={[markdownMessage]} />);

    expect(screen.getByText('Bold text', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('italic text', { selector: 'em' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'link' })).toHaveAttribute('href', 'https://example.com');
  });

  it('scrolls to bottom on new messages', async () => {
    const scrollIntoViewMock = jest.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    const { rerender } = render(<ChatInterface messages={mockMessages} />);

    const newMessages = [
      ...mockMessages,
      {
        _id: 'msg-3',
        _creationTime: Date.now(),
        role: 'user',
        content: 'New message',
        timestamp: new Date().toISOString(),
      },
    ];

    rerender(<ChatInterface messages={newMessages} />);

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });
});