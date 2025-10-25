import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { getPresentation, getClients, addClient } from '../api';

const ClientSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .max(255, 'Name is too long'),
  email: Yup.string()
    .email('Invalid email')
    .max(255, 'Email is too long'),
  phone: Yup.string()
    .max(50, 'Phone number is too long')
});

function ClientManagement() {
  const { id } = useParams();
  const [presentation, setPresentation] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [presentationResponse, clientsResponse] = await Promise.all([
          getPresentation(id),
          getClients(id)
        ]);
        
        setPresentation(presentationResponse.data);
        setClients(clientsResponse.data);
      } catch (error) {
        setError('Failed to fetch data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleAddClient = async (values, { setSubmitting, resetForm }) => {
    try {
      const response = await addClient(id, values);
      setClients([...clients, response.data]);
      resetForm();
      setSuccessMessage('Client added successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setError(
        error.response?.data?.message || 
        'Failed to add client. Please try again.'
      );
    } finally {
      setSubmitting(false);
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

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Manage Clients for "{presentation.title}"</h2>
      <div className="row mt-4">
        <div className="col-md-5">
          <div className="card">
            <div className="card-header">
              <h5>Add New Client</h5>
            </div>
            <div className="card-body">
              {successMessage && (
                <div className="alert alert-success" role="alert">
                  {successMessage}
                </div>
              )}
              
              <Formik
                initialValues={{
                  name: '',
                  email: '',
                  phone: ''
                }}
                validationSchema={ClientSchema}
                onSubmit={handleAddClient}
              >
                {({ isSubmitting }) => (
                  <Form>
                    <div className="mb-3">
                      <label htmlFor="name" className="form-label">Name *</label>
                      <Field
                        type="text"
                        name="name"
                        className="form-control"
                      />
                      <ErrorMessage
                        name="name"
                        component="div"
                        className="text-danger"
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="email" className="form-label">Email</label>
                      <Field
                        type="email"
                        name="email"
                        className="form-control"
                      />
                      <ErrorMessage
                        name="email"
                        component="div"
                        className="text-danger"
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="phone" className="form-label">Phone</label>
                      <Field
                        type="text"
                        name="phone"
                        className="form-control"
                      />
                      <ErrorMessage
                        name="phone"
                        component="div"
                        className="text-danger"
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Adding...' : 'Add Client'}
                    </button>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        </div>
        
        <div className="col-md-7">
          <div className="card">
            <div className="card-header">
              <h5>Clients</h5>
            </div>
            <div className="card-body">
              {clients.length === 0 ? (
                <p className="text-muted text-center">No clients have been added yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Added On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map(client => (
                        <tr key={client.id}>
                          <td>{client.name}</td>
                          <td>{client.email || '-'}</td>
                          <td>{client.phone || '-'}</td>
                          <td>{new Date(client.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientManagement;
