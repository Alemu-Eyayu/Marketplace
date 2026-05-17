import { useState } from 'react';
import { useSelector } from 'react-redux';
import client from '../api/client';

export default function ConversationTest() {
  const { user, accessToken } = useSelector((s) => s.auth);
  const [listingId, setListingId] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function testCreateConversation() {
    if (!listingId.trim()) {
      setError('Please enter a listing ID');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      console.log('Testing conversation creation with:', {
        listingId: listingId.trim(),
        user: user?._id,
        hasToken: !!accessToken
      });

      const response = await client.post('/conversations', { 
        listingId: listingId.trim() 
      });

      console.log('Success response:', response.data);
      setResult(JSON.stringify(response.data, null, 2));
    } catch (err) {
      console.error('Error creating conversation:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      setError(`${err.response?.status || 'Network'} Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function testGetConversations() {
    setLoading(true);
    setError('');
    setResult('');

    try {
      const response = await client.get('/conversations');
      console.log('Conversations response:', response.data);
      setResult(JSON.stringify(response.data, null, 2));
    } catch (err) {
      console.error('Error getting conversations:', err);
      setError(`${err.response?.status || 'Network'} Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function testGetListings() {
    setLoading(true);
    setError('');
    setResult('');

    try {
      const response = await client.get('/listings?limit=5');
      console.log('Listings response:', response.data);
      setResult(JSON.stringify(response.data, null, 2));
    } catch (err) {
      console.error('Error getting listings:', err);
      setError(`${err.response?.status || 'Network'} Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-4">
      <h2>Conversation System Test</h2>
      
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Authentication Status</h5>
            </div>
            <div className="card-body">
              {user ? (
                <div>
                  <p><strong>User ID:</strong> {user._id}</p>
                  <p><strong>Name:</strong> {user.fullName}</p>
                  <p><strong>Role:</strong> {user.role}</p>
                  <p><strong>Phone:</strong> {user.phone}</p>
                  <p><strong>Has Token:</strong> {accessToken ? 'Yes' : 'No'}</p>
                  <span className="badge bg-success">Authenticated</span>
                </div>
              ) : (
                <div>
                  <p>No user logged in</p>
                  <span className="badge bg-warning">Not Authenticated</span>
                  <div className="mt-2">
                    <a href="/login" className="btn btn-primary btn-sm">Login</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Test Actions</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <button 
                  className="btn btn-info btn-sm me-2" 
                  onClick={testGetListings}
                  disabled={loading}
                >
                  Get Listings
                </button>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={testGetConversations}
                  disabled={loading || !user}
                >
                  Get Conversations
                </button>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Listing ID for Conversation Test:</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={listingId}
                  onChange={(e) => setListingId(e.target.value)}
                  placeholder="Enter a listing ID"
                />
              </div>
              
              <button 
                className="btn btn-primary" 
                onClick={testCreateConversation}
                disabled={loading || !user || !listingId.trim()}
              >
                {loading ? 'Testing...' : 'Test Create Conversation'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mt-3">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="mt-3">
          <h5>Result:</h5>
          <pre className="bg-light p-3 rounded" style={{ fontSize: '0.9rem', maxHeight: '400px', overflow: 'auto' }}>
            {result}
          </pre>
        </div>
      )}

      <div className="mt-4">
        <div className="card">
          <div className="card-header">
            <h5>Instructions</h5>
          </div>
          <div className="card-body">
            <ol>
              <li><strong>Login first:</strong> If not authenticated, click the Login button</li>
              <li><strong>Get listings:</strong> Click "Get Listings" to see available listings and copy a listing ID</li>
              <li><strong>Test conversation:</strong> Paste a listing ID and click "Test Create Conversation"</li>
              <li><strong>Check console:</strong> Open browser dev tools to see detailed logs</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}