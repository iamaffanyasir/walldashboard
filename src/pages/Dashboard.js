import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPresentations } from '../api';

function Dashboard() {
  const { user } = useAuth();
  const [presentations, setPresentations] = useState([]);
  const [recentPresentations, setRecentPresentations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPresentations = async () => {
      try {
        const response = await getPresentations(user.id);
        setPresentations(response.data);
        
        // Get recent presentations (up to 5)
        const recent = response.data.slice(0, 5);
        setRecentPresentations(recent);
      } catch (error) {
        setError('Failed to fetch presentations');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.id) {
      fetchPresentations();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center mt-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row mb-4">
        <div className="col">
          <h1>Welcome, {user?.name || 'User'}</h1>
          <p className="lead">Manage your presentations and view client analytics</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="row">
        <div className="col-md-8">
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Presentations</h5>
              <Link to="/presentations" className="btn btn-outline-primary btn-sm">
                View All
              </Link>
            </div>
            <div className="card-body">
              {recentPresentations.length === 0 ? (
                <div className="text-center py-3">
                  <p>You haven't created any presentations yet.</p>
                  <Link to="/presentations/create" className="btn btn-primary">
                    Create Your First Presentation
                  </Link>
                </div>
              ) : (
                <div className="list-group">
                  {recentPresentations.map((presentation) => (
                    <Link
                      key={presentation.id}
                      to={`/presentations/${presentation.id}`}
                      className="list-group-item list-group-item-action"
                    >
                      <div className="d-flex w-100 justify-content-between">
                        <h5 className="mb-1">{presentation.title}</h5>
                        <small className="text-muted">
                          {new Date(presentation.created_at).toLocaleDateString()}
                        </small>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link to="/presentations/create" className="btn btn-primary">
                  Create New Presentation
                </Link>
                {presentations.length > 0 && (
                  <Link 
                    to={`/presentations/${presentations[0].id}/clients`} 
                    className="btn btn-outline-secondary"
                  >
                    Manage Clients
                  </Link>
                )}
                {presentations.length > 0 && (
                  <Link 
                    to={`/presentations/${presentations[0].id}/analytics`} 
                    className="btn btn-outline-info"
                  >
                    View Analytics
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Statistics</h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col">
                  <h3>{presentations.length}</h3>
                  <p className="text-muted">Presentations</p>
                </div>
                <div className="col">
                  <h3>
                    {/* This would come from aggregated analytics data */}
                    {presentations.length > 0 ? '0' : '-'}
                  </h3>
                  <p className="text-muted">Clients</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
