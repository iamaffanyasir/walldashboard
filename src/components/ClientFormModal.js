import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { addClient } from '../api';

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

function ClientFormModal({ presentationId, onSuccess, onCancel }) {
  const handleSubmit = async (values, { setSubmitting, setStatus }) => {
    try {
      // Add the client
      const response = await addClient(presentationId, values);
      
      // Call the success callback with the created client
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      console.error('Error adding client:', error);
      setStatus({
        error: error.response?.data?.message || 'Failed to add client. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Add Client Information</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onCancel}
              aria-label="Close"
            ></button>
          </div>
          
          <Formik
            initialValues={{
              name: '',
              email: '',
              phone: ''
            }}
            validationSchema={ClientSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, status }) => (
              <Form>
                <div className="modal-body">
                  {status && status.error && (
                    <div className="alert alert-danger">{status.error}</div>
                  )}
                  
                  <p className="text-muted mb-3">
                    Please enter the client information before starting the presentation.
                  </p>
                  
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label">Name *</label>
                    <Field
                      type="text"
                      name="name"
                      className="form-control"
                      placeholder="Enter client name"
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
                      placeholder="Enter client email"
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
                      placeholder="Enter client phone"
                    />
                    <ErrorMessage
                      name="phone"
                      component="div"
                      className="text-danger"
                    />
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Adding...' : 'Start Presentation'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
}

export default ClientFormModal;
