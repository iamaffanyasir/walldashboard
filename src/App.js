import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

// Components
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PresentationList from './pages/PresentationList';
import PresentationCreate from './pages/PresentationCreate';
import PresentationDetail from './pages/PresentationDetail';
import PresentationEdit from './pages/PresentationEdit';
import ClientManagement from './pages/ClientManagement';
import Analytics from './pages/Analytics';
import Navbar from './components/Navbar';
import DirectPresentation from './pages/DirectPresentation'; // Add the new component import

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Component to handle presentation routing based on mode parameter
const PresentationRouter = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode');
  
  // If mode=client, show DirectPresentation (no navbar)
  if (mode === 'client') {
    return <DirectPresentation />;
  }
  
  // Otherwise, show PresentationDetail with navbar
  return (
    <ProtectedRoute>
      <PresentationDetail />
    </ProtectedRoute>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            {/* Special route for direct presentation viewing - no navbar */}
            <Route path="/direct-presentation/:id" element={<DirectPresentation />} />
            
            {/* Routes with navbar */}
            <Route path="*" element={
              <>
                <Navbar />
                <div className="container mt-4">
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    
                    <Route 
                      path="/" 
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      } 
                    />
                    
                    <Route 
                      path="/presentations" 
                      element={
                        <ProtectedRoute>
                          <PresentationList />
                        </ProtectedRoute>
                      } 
                    />
                    
                    <Route 
                      path="/presentations/create" 
                      element={
                        <ProtectedRoute>
                          <PresentationCreate />
                        </ProtectedRoute>
                      } 
                    />
                    
                    <Route 
                      path="/presentations/:id" 
                      element={<PresentationRouter />}
                    />
                    
                    <Route 
                      path="/presentations/:id/edit" 
                      element={
                        <ProtectedRoute>
                          <PresentationEdit />
                        </ProtectedRoute>
                      } 
                    />
                    
                    <Route 
                      path="/presentations/:id/clients" 
                      element={
                        <ProtectedRoute>
                          <ClientManagement />
                        </ProtectedRoute>
                      } 
                    />
                    
                    <Route 
                      path="/presentations/:id/analytics" 
                      element={
                        <ProtectedRoute>
                          <Analytics />
                        </ProtectedRoute>
                      } 
                    />
                  </Routes>
                </div>
              </>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
