'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, getHeaders } from '../utils/api';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';


interface Connection {
  id: string;
  createdAt: string;
  state: string;
  role: string;
  theirLabel?: string;
  theirDid?: string;
  threadId?: string;
  invitationId?: string;
  url?: string;
  label?: string;
  autoAcceptConnection?: boolean;
}


interface Invitation {
  id: string;
  url: string;
  outOfBandInvitation: any;
}


interface Message {
  id: string;
  connectionId: string;
  content: string;
  role: 'sender' | 'receiver';
  createdAt: string;
  sentTime: string;
  threadId: string;
  updatedAt: string;
}


interface ConnectionsResponse {
  success: boolean;
  connections?: Connection[];
  invitations?: Connection[];
  message?: string;
}

interface InvitationResponse {
  success: boolean;
  invitation?: Invitation;
  message?: string;
}

interface ReceiveInvitationResponse {
  success: boolean;
  connection?: {
    id: string;
    state: string;
    role: string;
    theirLabel?: string;
    createdAt: string;
  };
  message?: string;
}

interface MessagesResponse {
  success: boolean;
  messages: Message[];
  message?: string;
}

export default function ConnectionsPage() {
  const { tenantId, token } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isCreatingInvitation, setIsCreatingInvitation] = useState(false);
  const [showInvitation, setShowInvitation] = useState(false);
  const [displayQrCode, setDisplayQrCode] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState('');
  const [isAcceptingInvitation, setIsAcceptingInvitation] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState<string | null>(null);
  

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);



  const walletId = `${tenantId}`;
  const walletKey = `${tenantId}`;

  useEffect(() => {
    async function fetchConnections() {
      if (!tenantId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Use authenticated API request
        const params = new URLSearchParams({ tenantId }).toString();
        const response = await apiGet(`/api/connections?${params}`) as ConnectionsResponse;
        
        if (response.success) {
          const allConnections = [
            ...(response.connections || []),
            ...(response.invitations || [])
          ];
          console.log('Connections from API:', JSON.stringify(allConnections, null, 2));
          setConnections(allConnections);
        } else {
          throw new Error(response.message || 'Failed to load connections');
        }
      } catch (err: any) {
        console.error('Error fetching connections:', err);
        setError(err.message || 'Unable to load connections');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchConnections();
    

    const intervalId = setInterval(fetchConnections, 30000);
    
    return () => clearInterval(intervalId);
  }, [tenantId, token]);


  const handleCreateInvitation = async () => {
    if (!tenantId) return;
    
    setIsCreatingInvitation(true);
    setError(null);
    
    try {
      // Use authenticated API request
      const response = await apiPost('/api/connections/invitation', {
        tenantId,
        walletId,
        walletKey
      }) as InvitationResponse;
      
      if (response.success && response.invitation) {
        console.log('Created invitation:', response.invitation);
        setInvitation(response.invitation);
        setShowInvitation(true);
        setDisplayQrCode(true); // Show QR code by default
      } else {
        throw new Error(response.message || 'Failed to create invitation');
      }
    } catch (err: any) {
      console.error('Error creating invitation:', err);
      setError(err.message || 'Unable to create invitation');
    } finally {
      setIsCreatingInvitation(false);
    }
  };


  const copyInvitationUrl = () => {
    if (invitation?.url) {
      navigator.clipboard.writeText(invitation.url)
        .then(() => {
          alert('Invitation URL copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy invitation URL:', err);
          alert('Failed to copy invitation URL');
        });
    }
  };


  const toggleDisplayMode = () => {
    setDisplayQrCode(!displayQrCode);
  };


  const showQrCodeForConnection = (connection: Connection) => {
    console.log('Showing QR for connection:', connection);
    setSelectedConnectionId(connection.id);
    setShowQrModal(true);
  };


  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenantId || !invitationUrl.trim()) return;
    
    setIsAcceptingInvitation(true);
    setError(null);
    setAcceptSuccess(null);
    
    try {
      // Use authenticated API request
      const response = await apiPost('/api/connections/receive-invitation', {
        invitationUrl,
        walletId,
        walletKey,
        tenantId
      }) as ReceiveInvitationResponse;
      
      console.log('Accepted invitation:', response);
      
      if (response.success && response.connection) {
        setAcceptSuccess(`Successfully accepted invitation from ${response.connection.theirLabel || 'unknown'}`);
        setInvitationUrl('');
        
        // Use authenticated API request
        const params = new URLSearchParams({ tenantId }).toString();
        const connectionsResponse = await apiGet(`/api/connections?${params}`) as ConnectionsResponse;
        
        if (connectionsResponse.success) {
          const allConnections = [
            ...(connectionsResponse.connections || []),
            ...(connectionsResponse.invitations || [])
          ];
          setConnections(allConnections);
        }
      } else {
        throw new Error(response.message || 'Failed to accept invitation');
      }
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setError(err.message || 'Unable to accept invitation');
    } finally {
      setIsAcceptingInvitation(false);
    }
  };


  const openMessageModal = async (connection: Connection) => {
    if (!tenantId) return;
    
    setSelectedConnection(connection);
    setShowMessageModal(true);
    setMessages([]);
    setNewMessage('');
    

    if (connection.state !== 'completed') {
      return;
    }
    
    setIsLoadingMessages(true);
    
    try {
      // Use authenticated API request
      const params = new URLSearchParams({ tenantId }).toString();
      const response = await apiGet(`/api/connections/messages/${connection.id}?${params}`) as MessagesResponse;
      
      if (response.success) {

        const sortedMessages = [...(response.messages || [])].sort((a, b) => {
          return parseTimestamp(a) - parseTimestamp(b); // Ascending order (oldest first)
        });
        
        setMessages(sortedMessages);
      } else {
        console.error('Failed to load messages:', response.message);
      }
    } catch (err: any) {
      console.error('Error loading messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenantId || !selectedConnection || !newMessage.trim()) return;
    
    setIsSendingMessage(true);
    
    try {
      // Use authenticated API request
      const response = await apiPost('/api/connections/message', {
        connectionId: selectedConnection.id,
        message: newMessage,
        tenantId
      }) as { success: boolean; message?: string };
      
      if (response.success) {
        // Use authenticated API request
        const params = new URLSearchParams({ tenantId }).toString();
        const messagesResponse = await apiGet(`/api/connections/messages/${selectedConnection.id}?${params}`) as MessagesResponse;
        
        if (messagesResponse.success) {

          const sortedMessages = [...(messagesResponse.messages || [])].sort((a, b) => {
            return parseTimestamp(a) - parseTimestamp(b); // Ascending order (oldest first)
          });
          setMessages(sortedMessages);
        }
        
        setNewMessage('');
      } else {
        console.error('Failed to send message:', response.message);
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
    } finally {
      setIsSendingMessage(false);
    }
  };


  const getStateBadgeColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'complete':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'invitation':
      case 'await-response':
        return 'bg-blue-100 text-blue-800';
      case 'request':
        return 'bg-yellow-100 text-yellow-800';
      case 'response':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };


  const parseTimestamp = (message: Message): number => {
    try {

      const timestamp = message.sentTime || message.createdAt;
      return new Date(timestamp).getTime();
    } catch (error) {
      console.error('Error parsing timestamp:', error);

      return Date.now();
    }
  };


  const isMessageFromMe = (message: Message) => {
    return message.role === 'sender';
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-black mb-6">Connections</h1>
      
      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-600 p-4 mb-6">
          <p className="text-rose-700">{error}</p>
        </div>
      )}
      
      {acceptSuccess && (
        <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-6">
          <p className="text-green-700">{acceptSuccess}</p>
        </div>
      )}
      
      <div className="mb-6 flex justify-between items-center">
        <p className="text-slate-600">
          Manage your connections with other agents and services
        </p>
        <div className="flex gap-2">
          <button 
            onClick={handleCreateInvitation}
            disabled={isCreatingInvitation}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            {isCreatingInvitation ? 'Creating...' : 'Create Invitation'}
          </button>
          <button
            onClick={() => setShowAcceptForm(!showAcceptForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            {showAcceptForm ? 'Hide Accept Form' : 'Accept Invitation'}
          </button>
          <Link 
            href="/"
            className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
      
      {/* Accept Invitation Form */}
      {showAcceptForm && (
        <div className="bg-white rounded-lg p-6 shadow mb-6 border-l-4 border-indigo-500">
          <h3 className="text-xl font-semibold text-slate-700 mb-4">Accept an Invitation</h3>
          <form onSubmit={handleAcceptInvitation}>
            <div className="mb-4">
              <label htmlFor="invitationUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Invitation URL
              </label>
              <input
                type="text"
                id="invitationUrl"
                value={invitationUrl}
                onChange={(e) => setInvitationUrl(e.target.value)}
                placeholder="Paste invitation URL here"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isAcceptingInvitation || !invitationUrl.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-300"
              >
                {isAcceptingInvitation ? 'Accepting...' : 'Accept Invitation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Display invitation when created */}
      {showInvitation && invitation && (
        <div className="bg-white rounded-lg p-6 shadow mb-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Invitation Created</h3>
            <button 
              onClick={() => setShowInvitation(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600">Share this invitation:</p>
              <button 
                onClick={toggleDisplayMode}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {displayQrCode ? 'Show URL' : 'Show QR Code'}
              </button>
            </div>
            
            {displayQrCode ? (
              <div className="flex justify-center p-4 bg-white">
                <div className="p-4 bg-white inline-block rounded-lg border border-gray-200">
                  <QRCodeSVG 
                    value={invitation.url} 
                    size={250}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"L"}
                    includeMargin={false}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-3 rounded-md mb-3 overflow-hidden">
                <p className="text-slate-700 break-all">{invitation.url}</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <button 
              onClick={copyInvitationUrl}
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
            >
              Copy Invitation URL
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal for Connection */}
      {showQrModal && selectedConnectionId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-slate-700">Connection QR Code</h3>
              <button 
                onClick={() => setShowQrModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {(() => {
              const connection = connections.find(c => c.id === selectedConnectionId);
              
              if (!connection || !connection.url) {
                return (
                  <p className="text-slate-600">Unable to generate QR code for this connection.</p>
                );
              }
              
              return (
                <>
                  <div className="flex justify-center p-4 bg-white">
                    <div className="p-4 bg-white inline-block rounded-lg border border-gray-200">
                      <QRCodeSVG 
                        value={connection.url}
                        size={250}
                        bgColor={"#ffffff"}
                        fgColor={"#000000"}
                        level={"L"}
                        includeMargin={false}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-slate-600 mb-2 text-sm">Invitation URL:</p>
                    <div className="bg-gray-50 p-3 rounded-md mb-3 overflow-hidden">
                      <p className="text-slate-700 break-all text-sm">{connection.url}</p>
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(connection.url || '');
                          alert('URL copied to clipboard!');
                        }}
                        className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
                      >
                        Copy URL
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && selectedConnection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-slate-700">
                Messages with {selectedConnection.theirLabel || 'Connection'}
              </h3>
              <button 
                onClick={() => setShowMessageModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {selectedConnection.state !== 'completed' && selectedConnection.state !== 'complete' ? (
              <div className="bg-yellow-50 p-4 rounded-md mb-4">
                <p className="text-yellow-700">
                  You can only exchange messages with completed connections. This connection is in state: {selectedConnection.state}
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto mb-4 p-3 bg-gray-50 rounded-md min-h-[300px]">
                  {isLoadingMessages ? (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-gray-500">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-gray-500">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Display messages sorted by time */}
                      {[...messages]
                        .sort((a, b) => {

                          return parseTimestamp(a) - parseTimestamp(b); // Ascending order (oldest first)
                        })
                        .map((msg, index) => (
                          <div 
                            key={msg.id || index} 
                            className={`p-3 rounded-lg max-w-[80%] ${
                              isMessageFromMe(msg) 
                                ? 'bg-blue-100 text-blue-800 ml-auto' 
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <p>{msg.content}</p>
                            <p className="text-xs mt-1 opacity-70">
                              {formatMessageDate(msg.sentTime || msg.createdAt)}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSendingMessage}
                  />
                  <button
                    type="submit"
                    className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                    disabled={isSendingMessage || !newMessage.trim()}
                  >
                    {isSendingMessage ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
      ) : connections.length === 0 ? (
        <div className="bg-white rounded-lg p-6 shadow text-center">
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Connections Found</h3>
          <p className="text-slate-600 mb-4">
            You don't have any connections yet. Create an invitation to connect with other agents.
          </p>
          <button 
            onClick={handleCreateInvitation}
            disabled={isCreatingInvitation}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            {isCreatingInvitation ? 'Creating...' : 'Create Invitation'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID / Created
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Label
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {connections.map((connection) => (
                <tr key={connection.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {connection.id}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(connection.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {connection.theirLabel || connection.label || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStateBadgeColor(connection.state)}`}>
                      {connection.state}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {connection.role}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex space-x-4">
                      {connection.state === 'await-response' && connection.url && (
                        <button
                          onClick={() => showQrCodeForConnection(connection)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Show QR
                        </button>
                      )}
                      <button
                        onClick={() => openMessageModal(connection)}
                        className="text-emerald-600 hover:text-emerald-900"
                      >
                        Messages
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}