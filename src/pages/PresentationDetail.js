import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPresentation, updatePresentation, deletePresentation } from '../api';
import ClientFormModal from '../components/ClientFormModal';

function PresentationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // New state variables for edit and delete functionality
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState('');
  // New state variable for client form modal
  const [showClientModal, setShowClientModal] = useState(false);

  useEffect(() => {
    const fetchPresentation = async () => {
      try {
        const response = await getPresentation(id);
        setPresentation(response.data);
        // Initialize edit form with current values
        setEditTitle(response.data.title);
        setEditPassword(''); // Don't pre-fill password for security reasons
      } catch (error) {
        setError('Failed to fetch presentation details');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchPresentation();
  }, [id]);

  const launchPresentation = () => {
    // Show client form modal instead of directly opening the presentation
    setShowClientModal(true);
  };
  
  // Handler for client form success
  const handleClientAdded = (client) => {
    // Close the modal
    setShowClientModal(false);
    
    // Open the presentation with the client ID
    window.open(`/direct-presentation/${id}?client=${client.id}`, '_blank');
  };

  // New function to handle editing a presentation
  const handleEditPresentation = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    setUpdateError('');

    try {
      // Create update object - only include password if it's been changed
      const updateData = {
        title: editTitle,
        ...(editPassword && { password: editPassword })
      };
      
      // Use the API function to update presentation
      const response = await updatePresentation(id, updateData);
      
      // Update local state
      setPresentation(response.data);
      setShowEditModal(false);
      
    } catch (error) {
      console.error('Error updating presentation:', error);
      setUpdateError('Failed to update presentation. Please try again.');
    } finally {
      setUpdateLoading(false);
    }
  };

  // New function to handle deleting a presentation
  const handleDeletePresentation = async () => {
    setUpdateLoading(true);
    
    try {
      // Use the API function to delete presentation
      await deletePresentation(id);
      
      // Navigate back to presentations list
      navigate('/presentations', { state: { message: 'Presentation deleted successfully' } });
      
    } catch (error) {
      console.error('Error deleting presentation:', error);
      setUpdateError('Failed to delete presentation. Please try again.');
      setShowDeleteModal(false);
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center mt-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="alert alert-danger" role="alert">
        {error || 'Presentation not found'}
      </div>
    );
  }

  return (
    <div className="container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{presentation.title}</h2>
        <div>
          <button
            className="btn btn-success me-2"
            onClick={launchPresentation}
          >
            Start Presentation
          </button>
          <Link 
            to={`/presentations/${id}/clients`} 
            className="btn btn-primary me-2"
          >
            Manage Clients
          </Link>
          <Link 
            to={`/presentations/${id}/analytics`} 
            className="btn btn-info me-2"
          >
            View Analytics
          </Link>
          {/* New edit and delete buttons */}
          <Link 
            to={`/presentations/${id}/edit`} 
            className="btn btn-warning me-2"
          >
            <i className="fas fa-edit"></i> Edit Content
          </Link>
          <button
            className="btn btn-danger"
            onClick={() => setShowDeleteModal(true)}
          >
            <i className="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5>Presentation Details</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <p><strong>Created:</strong> {new Date(presentation.created_at).toLocaleString()}</p>
              <p><strong>Last Updated:</strong> {new Date(presentation.updated_at).toLocaleString()}</p>
            </div>
            <div className="col-md-6">
              <p><strong>Total Sections:</strong> {presentation.sections?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5>Sections</h5>
        </div>
        <div className="card-body">
          {presentation.sections && presentation.sections.length > 0 ? (
            <div className="accordion" id="sectionAccordion">
              {presentation.sections.map((section, index) => (
                <div className="accordion-item" key={section.id}>
                  <h2 className="accordion-header" id={`heading-${section.id}`}>
                    <button
                      className="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target={`#collapse-${section.id}`}
                      aria-expanded="false"
                      aria-controls={`collapse-${section.id}`}
                    >
                      <strong>Section {index + 1}:</strong> {section.heading} 
                      <span className="badge bg-secondary ms-2">{section.type}</span>
                    </button>
                  </h2>
                  <div
                    id={`collapse-${section.id}`}
                    className="accordion-collapse collapse"
                    aria-labelledby={`heading-${section.id}`}
                    data-bs-parent="#sectionAccordion"
                  >
                    <div className="accordion-body">
                      <p><strong>Type:</strong> {section.type}</p>
                      <p><strong>Items:</strong> {section.items?.length || 0}</p>
                      
                      {section.items && section.items.length > 0 && (
                        <div className="mt-3">
                          <h6>Content:</h6>
                          <ul className="list-group">
                            {section.items.map((item) => (
                              <li key={item.id} className="list-group-item">
                                {item.original_name || item.filename}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-center">No sections found in this presentation.</p>
          )}
        </div>
      </div>

      {/* Edit Presentation Modal */}
      {showEditModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Presentation</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowEditModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <form onSubmit={handleEditPresentation}>
                <div className="modal-body">
                  {updateError && (
                    <div className="alert alert-danger">{updateError}</div>
                  )}
                  <div className="mb-3">
                    <label htmlFor="editTitle" className="form-label">Title</label>
                    <input
                      type="text"
                      className="form-control"
                      id="editTitle"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="editPassword" className="form-label">
                      Password <span className="text-muted">(leave blank to keep current password)</span>
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="editPassword"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowEditModal(false)}
                    disabled={updateLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={updateLoading}
                  >
                    {updateLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDeleteModal(false)}
                  aria-label="Close"
                  disabled={updateLoading}
                ></button>
              </div>
              <div className="modal-body">
                {updateError && (
                  <div className="alert alert-danger">{updateError}</div>
                )}
                <p>Are you sure you want to delete the presentation <strong>"{presentation.title}"</strong>?</p>
                <p className="text-danger">This action cannot be undone. All sections, content files, and analytics data will be permanently deleted.</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={updateLoading}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleDeletePresentation}
                  disabled={updateLoading}
                >
                  {updateLoading ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Form Modal - New Addition */}
      {showClientModal && (
        <ClientFormModal 
          presentationId={id}
          onSuccess={handleClientAdded}
          onCancel={() => setShowClientModal(false)}
        />
      )}
    </div>
  );
}

export default PresentationDetail;