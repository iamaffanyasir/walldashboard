import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
// Import recharts components
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getAnalytics, getPresentation, getClients } from '../api';

function Analytics() {
  const { id } = useParams();
  const [presentation, setPresentation] = useState(null);
  const [clients, setClients] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [selectedClient, setSelectedClient] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [presentationResponse, clientsResponse] = await Promise.all([
          getPresentation(id),
          getClients(id)
        ]);
        
        setPresentation(presentationResponse.data);
        setClients(clientsResponse.data);
        
        // After getting clients, fetch analytics
        const clientId = selectedClient === 'all' ? undefined : selectedClient;
        const analyticsResponse = await getAnalytics(id, clientId);
        
        console.log('Analytics response:', analyticsResponse.data);
        
        // Process analytics data for charting
        const processedData = processAnalyticsData(analyticsResponse.data, presentationResponse.data.sections);
        setAnalytics(processedData);
      } catch (error) {
        setError('Failed to fetch analytics data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, selectedClient]);

  const processAnalyticsData = (data, sections) => {
    console.log('Processing analytics data:', data);
    
    // Group by section and calculate statistics
    const sectionMap = {};
    
    // Initialize sections
    if (sections && sections.length > 0) {
      sections.forEach(section => {
        sectionMap[section.id] = {
          id: section.id,
          name: section.heading,
          totalTime: 0,
          clientCount: 0,
          views: 0,
          averageTime: 0,
          clientDetails: {} // Add client-specific tracking
        };
      });
    }
    
    // Process analytics data from summary table
    if (data && data.summary && data.summary.length > 0) {
      console.log('Processing summary data:', data.summary);
      
      data.summary.forEach(record => {
        const sectionId = record.section_id;
        const clientId = record.client_id;
        const totalTimeMs = record.total_time_ms || 0;
        
        if (!sectionMap[sectionId]) {
          // Create section if it doesn't exist (in case sections were deleted)
          sectionMap[sectionId] = {
            id: sectionId,
            name: record.section_heading || `Section ${sectionId}`,
            totalTime: 0,
            clientCount: 0,
            views: 0,
            averageTime: 0,
            clientDetails: {}
          };
        }
        
        // Add client-specific data
        if (!sectionMap[sectionId].clientDetails[clientId]) {
          sectionMap[sectionId].clientDetails[clientId] = {
            totalTime: 0,
            views: 1 // Each record represents at least one view
          };
        }
        
        sectionMap[sectionId].clientDetails[clientId].totalTime += totalTimeMs;
        sectionMap[sectionId].clientDetails[clientId].views += 1;
        
        // Update section totals
        sectionMap[sectionId].totalTime += totalTimeMs;
        sectionMap[sectionId].views += 1;
        sectionMap[sectionId].clientCount += 1;
      });
      
      // Calculate averages
      Object.keys(sectionMap).forEach(id => {
        if (sectionMap[id].views > 0) {
          sectionMap[id].averageTime = Math.round(sectionMap[id].totalTime / sectionMap[id].views);
        }
      });
    }
    
    console.log('Processed section map:', sectionMap);
    
    // Convert to array for chart
    return Object.values(sectionMap).map(section => ({
      name: section.name,
      totalTime: Math.round(section.totalTime / 1000), // Convert to seconds
      averageTime: Math.round(section.averageTime / 1000), // Convert to seconds
      views: section.views,
      clientCount: section.clientCount,
      clientDetails: section.clientDetails
    }));
  };

  const handleClientChange = (e) => {
    setSelectedClient(e.target.value);
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

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Analytics for "{presentation?.title || 'Presentation'}"</h2>
      
      <div className="row mt-4">
        <div className="col-md-4 mb-3">
          <div className="card">
            <div className="card-header">
              <h5>Filters</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label htmlFor="clientFilter" className="form-label">Client</label>
                <select 
                  id="clientFilter"
                  className="form-select"
                  value={selectedClient}
                  onChange={handleClientChange}
                >
                  <option value="all">All Clients</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h5>Section Time Analysis (seconds)</h5>
            </div>
            <div className="card-body">
              {analytics.length === 0 ? (
                <div className="text-center py-5">
                  <p>No analytics data available yet.</p>
                  <small className="text-muted">
                    Data will appear once clients have viewed the presentation.
                  </small>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={analytics}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value} seconds`} />
                    <Legend />
                    <Bar dataKey="totalTime" name="Total Time (seconds)" fill="#8884d8" />
                    <Bar dataKey="averageTime" name="Avg Time (seconds)" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Add additional charts for richer analytics */}
      {analytics.length > 0 && (
        <div className="row mt-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5>Views by Section</h5>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics}
                      nameKey="name"
                      dataKey="views"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`#${Math.floor(Math.random()*16777215).toString(16)}`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} views`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5>Average Viewing Time Trend</h5>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={analytics.map((item, index) => ({...item, order: index + 1}))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="order" label={{ value: 'Section Order', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Time (seconds)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => `${value} seconds`} />
                    <Legend />
                    <Line type="monotone" dataKey="averageTime" name="Average Viewing Time" stroke="#ff7300" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5>Detailed Analytics</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Total View Time</th>
                      <th>Average View Time</th>
                      {selectedClient === 'all' && <th>Client Count</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.map((item) => (
                      <tr key={item.name}>
                        <td>{item.name}</td>
                        <td>{formatTime(item.totalTime)}</td>
                        <td>{formatTime(item.averageTime)}</td>
                        {selectedClient === 'all' && (
                          <td>{item.clientCount || 0}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {selectedClient !== 'all' && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5>Selected Client Detail</h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Section</th>
                        <th>Views</th>
                        <th>Total Time</th>
                        <th>Average Time per View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.map((item) => {
                        // Get client-specific data
                        const clientData = item.clientDetails[selectedClient] || { totalTime: 0, views: 0 };
                        const avgTimePerView = clientData.views > 0 
                          ? Math.round(clientData.totalTime / clientData.views / 1000)
                          : 0;
                        
                        return (
                          <tr key={item.name}>
                            <td>{item.name}</td>
                            <td>{clientData.views || 0}</td>
                            <td>{formatTime(clientData.totalTime / 1000)}</td>
                            <td>{formatTime(avgTimePerView)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format seconds into mm:ss format
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default Analytics;
