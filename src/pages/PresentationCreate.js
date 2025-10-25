import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import { createPresentation, addSection, addItem } from '../api';

const PresentationSchema = Yup.object().shape({
  title: Yup.string()
    .required('Title is required')
    .max(255, 'Title is too long'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  sections: Yup.array().of(
    Yup.object().shape({
      heading: Yup.string()
        .required('Section heading is required')
        .max(255, 'Heading is too long'),
      type: Yup.string()
        .required('Section type is required')
        .oneOf(['images', 'videos', 'map', '3d', 'ppt', 'pdf'], 'Invalid section type')
    })
  )
});

function PresentationCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [presentationId, setPresentationId] = useState(null);
  const [sections, setSections] = useState([]);
  const [files, setFiles] = useState({});
  const [urls, setUrls] = useState({});

  const handleFileChange = (sectionIndex, event) => {
    const newFiles = { ...files };
    newFiles[sectionIndex] = event.target.files;
    setFiles(newFiles);
  };

  const handleUrlChange = (sectionIndex, event) => {
    const newUrls = { ...urls };
    newUrls[sectionIndex] = event.target.value;
    setUrls(newUrls);
  };

  const handlePresentationSubmit = async (values) => {
    try {
      // Create presentation
      const presentationData = {
        title: values.title,
        password: values.password,
        user_id: user.id
      };
      
      const presentationResponse = await createPresentation(presentationData);
      const presentationId = presentationResponse.data.id;
      setPresentationId(presentationId);
      
      // Create sections
      const createdSections = [];
      for (let i = 0; i < values.sections.length; i++) {
        const section = values.sections[i];
        const sectionData = {
          heading: section.heading,
          type: section.type,
          seq: i + 1
        };
        
        const sectionResponse = await addSection(presentationId, sectionData);
        createdSections.push(sectionResponse.data);
      }
      
      setSections(createdSections);
      setCurrentStep(2);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create presentation');
    }
  };

  const handleFilesSubmit = async () => {
    try {
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const sectionFiles = files[i];
        const sectionUrl = urls[i];
        
        // For map type sections, use URL
        if (section.type === 'map' && sectionUrl) {
          await addItem(section.id, {
            url: sectionUrl,
            seq: 1
          });
          continue;
        }
        
        // For file-based sections
        if (sectionFiles && sectionFiles.length > 0) {
          for (let j = 0; j < sectionFiles.length; j++) {
            await addItem(section.id, {
              file: sectionFiles[j],
              seq: j + 1
            });
          }
        }
      }
      
      // Navigate to the presentation detail page
      navigate(`/presentations/${presentationId}`);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to upload files');
    }
  };

  return (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Create New Presentation</h3>
          </div>
          <div className="card-body">
            {error && (
              <div className="alert alert-danger">{error}</div>
            )}
            
            {currentStep === 1 && (
              <Formik
                initialValues={{
                  title: '',
                  password: '',
                  sections: [{ heading: '', type: '' }]
                }}
                validationSchema={PresentationSchema}
                onSubmit={handlePresentationSubmit}
              >
                {({ values, isSubmitting }) => (
                  <Form>
                    <div className="mb-3">
                      <label htmlFor="title" className="form-label">Presentation Title</label>
                      <Field name="title" type="text" className="form-control" />
                      <ErrorMessage name="title" component="div" className="text-danger" />
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="password" className="form-label">Password</label>
                      <Field name="password" type="password" className="form-control" />
                      <ErrorMessage name="password" component="div" className="text-danger" />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Sections</label>
                      <FieldArray name="sections">
                        {({ push, remove }) => (
                          <>
                            {values.sections.map((section, index) => (
                              <div key={index} className="card mb-3">
                                <div className="card-body">
                                  <h5 className="card-title">Section {index + 1}</h5>
                                  
                                  <div className="mb-3">
                                    <label htmlFor={`sections.${index}.heading`} className="form-label">Heading</label>
                                    <Field name={`sections.${index}.heading`} className="form-control" />
                                    <ErrorMessage name={`sections.${index}.heading`} component="div" className="text-danger" />
                                  </div>
                                  
                                  <div className="mb-3">
                                    <label htmlFor={`sections.${index}.type`} className="form-label">Type</label>
                                    <Field as="select" name={`sections.${index}.type`} className="form-select">
                                      <option value="">Select type</option>
                                      <option value="images">Images</option>
                                      <option value="videos">Videos</option>
                                      <option value="map">Map</option>
                                      <option value="3d">3D Model</option>
                                      <option value="ppt">PowerPoint</option>
                                      <option value="pdf">PDF</option>
                                    </Field>
                                    <ErrorMessage name={`sections.${index}.type`} component="div" className="text-danger" />
                                  </div>
                                  
                                  {index > 0 && (
                                    <button
                                      type="button"
                                      className="btn btn-danger"
                                      onClick={() => remove(index)}
                                    >
                                      Remove Section
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            
                            <button
                              type="button"
                              className="btn btn-secondary mb-3"
                              onClick={() => push({ heading: '', type: '' })}
                            >
                              Add Section
                            </button>
                          </>
                        )}
                      </FieldArray>
                    </div>
                    
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Creating...' : 'Next: Upload Files'}
                    </button>
                  </Form>
                )}
              </Formik>
            )}
            
            {currentStep === 2 && (
              <div>
                <h4 className="mb-3">Upload Content for Sections</h4>
                
                {sections.map((section, index) => (
                  <div key={section.id} className="card mb-3">
                    <div className="card-body">
                      <h5 className="card-title">{section.heading}</h5>
                      <p className="card-text">Type: {section.type}</p>
                      
                      {section.type === 'map' ? (
                        <div className="mb-3">
                          <label className="form-label">Google Maps Embed URL</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="https://www.google.com/maps/embed?..."
                            onChange={(e) => handleUrlChange(index, e)}
                          />
                        </div>
                      ) : (
                        <div className="mb-3">
                          <label className="form-label">
                            Upload {section.type === 'images' ? 'Images' : 
                                    section.type === 'videos' ? 'Videos' :
                                    section.type === 'ppt' ? 'PowerPoint' :
                                    section.type === 'pdf' ? 'PDF' : 'Files'}
                          </label>
                          <input
                            type="file"
                            className="form-control"
                            multiple={section.type === 'images' || section.type === 'videos'}
                            accept={section.type === 'images' ? 'image/*' :
                                   section.type === 'videos' ? 'video/*' :
                                   section.type === 'pdf' ? 'application/pdf' :
                                   section.type === 'ppt' ? '.ppt,.pptx' : null}
                            onChange={(e) => handleFileChange(index, e)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <button
                  className="btn btn-primary me-2"
                  onClick={handleFilesSubmit}
                >
                  Save Presentation
                </button>
                
                <button
                  className="btn btn-secondary"
                  onClick={() => setCurrentStep(1)}
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PresentationCreate;
