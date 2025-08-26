import { useState, useEffect } from 'react';
import { Upload, MessageSquare, FileText, Brain, Trash2, Send } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/documents`);
      setDocuments(response.data.documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files.length) return;

    setIsLoading(true);
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));

    try {
      await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Files uploaded successfully!');
      fetchDocuments();
    } catch (error) {
      alert('Error uploading files: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, { message: inputMessage });
      const aiMessage = { 
        role: 'assistant', 
        content: response.data.response,
        sources: response.data.sources
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = { 
        role: 'assistant', 
        content: 'Error: ' + error.message,
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <Brain className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">DAS - Document AI System</h1>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Upload className="h-5 w-5" />
              <span>Upload Documents</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'chat'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              <span>Chat with DAS</span>
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'docs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span>My Documents</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Documents</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4 flex justify-center text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                  <span>Upload files</span>
                  <input 
                    type="file" 
                    multiple 
                    onChange={handleFileUpload}
                    disabled={isLoading}
                    className="sr-only" 
                    accept=".pdf,.docx,.txt,.xlsx,.xls"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                PDF, DOCX, TXT, Excel files up to 10MB each
              </p>
              {isLoading && <p className="text-blue-500 mt-2">Processing files...</p>}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Chat with DAS</h2>
            <div className="border rounded-lg p-4 h-96 overflow-y-auto mb-4 bg-gray-50">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center">Start a conversation about your documents...</p>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block p-3 rounded-lg max-w-xs ${
                      msg.role === 'user' 
                        ? 'bg-blue-100 text-blue-900' 
                        : msg.error
                        ? 'bg-red-100 text-red-900'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      {msg.sources && (
                        <p className="text-xs text-gray-500 mt-1">
                          From: {msg.sources.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex space-x-4">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask something about your documents..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                disabled={isLoading}
              />
              <button 
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-400 flex items-center"
              >
                <Send size={18} className="mr-1" />
                Send
              </button>
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">My Documents</h2>
            {documents.length === 0 ? (
              <p className="text-gray-500">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{doc.filename}</h3>
                      <p className="text-sm text-gray-500">
                        {Math.round(doc.size / 1024)} KB • {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;