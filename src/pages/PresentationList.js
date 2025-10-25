import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPresentations } from '../api';
import ClientFormModal from '../components/ClientFormModal';

function PresentationList() {
  const { user } = useAuth();
  const location = useLocation(); // Get location to check for messages from redirect
  const [presentations, setPresentations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // New state variables for client form modal
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedPresentationId, setSelectedPresentationId] = useState(null);

  useEffect(() => {
    // Check for success message from redirect (e.g., after deletion)
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the location state to avoid showing the message after refresh
      window.history.replaceState({}, document.title);
    }

    const fetchPresentations = async () => {
      try {
        const response = await getPresentations(user.id);
        setPresentations(response.data);
      } catch (error) {
        setError('Failed to fetch presentations');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchPresentations();
  }, [user.id, location.state]);

  // Modified function to launch presentation
  const launchPresentation = (presentationId) => {
    // Set the selected presentation ID
    setSelectedPresentationId(presentationId);
    
    // Show the client form modal
    setShowClientModal(true);
  };
  
  // Handler for client form success
  const handleClientAdded = (client) => {
    // Close the modal
    setShowClientModal(false);
    
    // Open the presentation with the client ID
    if (selectedPresentationId) {
      window.open(`/direct-presentation/${selectedPresentationId}?client=${client.id}`, '_blank');
      setSelectedPresentationId(null);
    }
  };

  return (
    <div className="row">
      <div className="col-12">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>My Presentations</h2>
          <Link to="/presentations/create" className="btn btn-primary">
            Create New Presentation
          </Link>
        </div>
        
        {successMessage && (
          <div className="alert alert-success alert-dismissible fade show" role="alert">
            {successMessage}
            <button 
              type="button" 
              className="btn-close" 
              data-bs-dismiss="alert" 
              aria-label="Close"
              onClick={() => setSuccessMessage('')}
            ></button>
          </div>
        )}
        
        {error && (
          <div className="alert alert-danger">{error}</div>
        )}
        
        {loading ? (
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : presentations.length === 0 ? (
          <div className="alert alert-info">
            You haven't created any presentations yet. Click "Create New Presentation" to get started.
          </div>
        ) : (
          <div className="row">
            {presentations.map(presentation => (
              <div key={presentation.id} className="col-md-4 mb-4">
                <div className="card h-100">
                  <div className="card-body">
                    <h5 className="card-title">{presentation.title}</h5>
                    <p className="card-text">
                      Created: {new Date(presentation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="card-footer">
                    <div className="d-flex justify-content-between">
                      <Link 
                        to={`/presentations/${presentation.id}`}
                        className="btn btn-sm btn-outline-primary"
                      >
                        View Details
                      </Link>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => launchPresentation(presentation.id)}
                      >
                        Start Presentation
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add the client form modal */}
      {showClientModal && selectedPresentationId && (
        <ClientFormModal 
          presentationId={selectedPresentationId}
          onSuccess={handleClientAdded}
          onCancel={() => {
            setShowClientModal(false);
            setSelectedPresentationId(null);
          }}
        />
      )}
    </div>
  );
}

export default PresentationList;
