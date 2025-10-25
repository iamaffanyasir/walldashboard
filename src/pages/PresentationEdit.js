import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { 
  getPresentation, 
  updatePresentation, 
  addSection, 
  updateSection, 
  deleteSection,
  addItem, 
  updateItem, 
  deleteItem 
} from '../api';

const PresentationEditSchema = Yup.object().shape({
  title: Yup.string()
    .required('Title is required')
    .max(255, 'Title is too long'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters'),
  sections: Yup.array().of(
    Yup.object().shape({
      id: Yup.number(),
      heading: Yup.string()
        .required('Section heading is required')
        .max(255, 'Heading is too long'),
      type: Yup.string()
        .required('Section type is required')
        .oneOf(['images', 'videos', 'map', '3d', 'ppt', 'pdf'], 'Invalid section type'),
      seq: Yup.number()
        .required('Sequence is required')
        .min(1, 'Sequence must be at least 1')
    })
  )
});

function PresentationEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState({});
  const [urls, setUrls] = useState({});
  // Removed unused state variables

  useEffect(() => {
    const fetchPresentation = async () => {
      try {
        const response = await getPresentation(id);
        setPresentation(response.data);
        
        // Initialize files and URLs state
        const initialFiles = {};
        const initialUrls = {};
        
        response.data.sections?.forEach((section, sectionIndex) => {
          section.items?.forEach((item, itemIndex) => {
            const key = `${sectionIndex}_${itemIndex}`;
            if (item.filename && !item.filename.startsWith('http')) {
              // This is a file, not a URL
            } else if (item.filename && item.filename.startsWith('http')) {
              initialUrls[key] = item.filename;
            }
          });
        });
        
        setFiles(initialFiles);
        setUrls(initialUrls);
      } catch (error) {
        setError('Failed to fetch presentation details');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchPresentation();
  }, [id]);

  const handleFileChange = (sectionIndex, itemIndex, event) => {
    const newFiles = { ...files };
    const key = `${sectionIndex}_${itemIndex}`;
    newFiles[key] = event.target.files[0];
    setFiles(newFiles);
  };

  const handleUrlChange = (sectionIndex, itemIndex, event) => {
    const newUrls = { ...urls };
    const key = `${sectionIndex}_${itemIndex}`;
    newUrls[key] = event.target.value;
    setUrls(newUrls);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    setError('');

    try {
      // Update presentation basic info
      const presentationData = {
        title: values.title,
        ...(values.password && { password: values.password })
      };
      
      await updatePresentation(id, presentationData);

      // Update sections
      for (let i = 0; i < values.sections.length; i++) {
        const section = values.sections[i];
        
        if (section.id) {
          // Update existing section
          await updateSection(section.id, {
            heading: section.heading,
            type: section.type,
            seq: section.seq
          });
        } else {
          // Create new section
          const sectionResponse = await addSection(id, {
            heading: section.heading,
            type: section.type,
            seq: section.seq
          });
          section.id = sectionResponse.data.id;
        }

        // Update section items
        if (section.items) {
          for (let j = 0; j < section.items.length; j++) {
            const item = section.items[j];
            const key = `${i}_${j}`;
            
            if (item.id) {
              // Update existing item
              const updateData = {
                seq: item.seq || j + 1
              };
              
              // Add file or URL if provided
              if (files[key]) {
                updateData.file = files[key];
              } else if (urls[key]) {
                updateData.url = urls[key];
              }
              
              if (Object.keys(updateData).length > 1) { // More than just seq
                await updateItem(section.id, item.id, updateData);
              }
            } else {
              // Create new item
              const itemData = {
                seq: item.seq || j + 1
              };
              
              if (files[key]) {
                itemData.file = files[key];
              } else if (urls[key]) {
                itemData.url = urls[key];
              }
              
              if (files[key] || urls[key]) {
                await addItem(section.id, itemData);
              }
            }
          }
        }
      }

      // Navigate back to presentation detail
      navigate(`/presentations/${id}`, { 
        state: { message: 'Presentation updated successfully' } 
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update presentation');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (sectionId, sectionIndex) => {
    if (window.confirm('Are you sure you want to delete this section? This will also delete all items in this section.')) {
      try {
        await deleteSection(sectionId);
        // Remove from form values
        const newSections = presentation.sections.filter((_, index) => index !== sectionIndex);
        setPresentation({ ...presentation, sections: newSections });
      } catch (error) {
        setError('Failed to delete section');
        console.error(error);
      }
    }
  };

  const handleDeleteItem = async (sectionId, itemId, sectionIndex, itemIndex) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteItem(sectionId, itemId);
        // Remove from form values
        const newSections = [...presentation.sections];
        newSections[sectionIndex].items = newSections[sectionIndex].items.filter((_, index) => index !== itemIndex);
        setPresentation({ ...presentation, sections: newSections });
      } catch (error) {
        setError('Failed to delete item');
        console.error(error);
      }
    }
  };

  const addNewSection = (values, setFieldValue) => {
    const newSection = {
      heading: '',
      type: 'images',
      seq: values.sections.length + 1,
      items: []
    };
    setFieldValue('sections', [...values.sections, newSection]);
  };

  const addNewItem = (sectionIndex, values, setFieldValue) => {
    const newItem = {
      seq: values.sections[sectionIndex].items.length + 1
    };
    const newSections = [...values.sections];
    newSections[sectionIndex].items = [...newSections[sectionIndex].items, newItem];
    setFieldValue('sections', newSections);
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

  if (error && !presentation) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="alert alert-warning" role="alert">
        Presentation not found
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row mb-4">
        <div className="col">
          <h2>Edit Presentation</h2>
          <p className="text-muted">Modify your presentation content, sections, and items</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <Formik
        initialValues={{
          title: presentation.title || '',
          password: '',
          sections: presentation.sections?.map(section => ({
            id: section.id,
            heading: section.heading || '',
            type: section.type || 'images',
            seq: section.seq || 1,
            items: section.items?.map(item => ({
              id: item.id,
              seq: item.seq || 1,
              filename: item.filename || '',
              original_name: item.original_name || ''
            })) || []
          })) || []
        }}
        validationSchema={PresentationEditSchema}
        onSubmit={handleSubmit}
      >
        {({ values, setFieldValue }) => (
          <Form>
            {/* Basic Information */}
            <div className="card mb-4">
              <div className="card-header">
                <h5>Basic Information</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-8">
                    <div className="mb-3">
                      <label htmlFor="title" className="form-label">Presentation Title</label>
                      <Field
                        type="text"
                        className="form-control"
                        id="title"
                        name="title"
                        placeholder="Enter presentation title"
                      />
                      <ErrorMessage name="title" component="div" className="text-danger" />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="password" className="form-label">New Password (optional)</label>
                      <Field
                        type="password"
                        className="form-control"
                        id="password"
                        name="password"
                        placeholder="Leave blank to keep current"
                      />
                      <ErrorMessage name="password" component="div" className="text-danger" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="card mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5>Sections</h5>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => addNewSection(values, setFieldValue)}
                >
                  Add Section
                </button>
              </div>
              <div className="card-body">
                <FieldArray name="sections">
                  {() => (
                    <div>
                      {values.sections.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="card mb-3">
                          <div className="card-header d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">Section {sectionIndex + 1}</h6>
                            <div>
                              {section.id && (
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm me-2"
                                  onClick={() => handleDeleteSection(section.id, sectionIndex)}
                                >
                                  Delete Section
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="card-body">
                            <div className="row">
                              <div className="col-md-4">
                                <div className="mb-3">
                                  <label className="form-label">Heading</label>
                                  <Field
                                    type="text"
                                    className="form-control"
                                    name={`sections.${sectionIndex}.heading`}
                                    placeholder="Section heading"
                                  />
                                  <ErrorMessage name={`sections.${sectionIndex}.heading`} component="div" className="text-danger" />
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="mb-3">
                                  <label className="form-label">Type</label>
                                  <Field
                                    as="select"
                                    className="form-control"
                                    name={`sections.${sectionIndex}.type`}
                                  >
                                    <option value="images">Images</option>
                                    <option value="videos">Videos</option>
                                    <option value="map">Map</option>
                                    <option value="3d">3D</option>
                                    <option value="ppt">PowerPoint</option>
                                    <option value="pdf">PDF</option>
                                  </Field>
                                </div>
                              </div>
                              <div className="col-md-2">
                                <div className="mb-3">
                                  <label className="form-label">Sequence</label>
                                  <Field
                                    type="number"
                                    className="form-control"
                                    name={`sections.${sectionIndex}.seq`}
                                    min="1"
                                  />
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="mb-3">
                                  <label className="form-label">Actions</label>
                                  <div>
                                    <button
                                      type="button"
                                      className="btn btn-success btn-sm"
                                      onClick={() => addNewItem(sectionIndex, values, setFieldValue)}
                                    >
                                      Add Item
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Section Items */}
                            <div className="mt-3">
                              <h6>Items</h6>
                              <FieldArray name={`sections.${sectionIndex}.items`}>
                                {() => (
                                  <div>
                                    {section.items?.map((item, itemIndex) => (
                                      <div key={itemIndex} className="card mb-2">
                                        <div className="card-body">
                                          <div className="row align-items-center">
                                            <div className="col-md-3">
                                              <div className="mb-2">
                                                <label className="form-label">Sequence</label>
                                                <Field
                                                  type="number"
                                                  className="form-control form-control-sm"
                                                  name={`sections.${sectionIndex}.items.${itemIndex}.seq`}
                                                  min="1"
                                                />
                                              </div>
                                            </div>
                                            <div className="col-md-4">
                                              <div className="mb-2">
                                                <label className="form-label">
                                                  {section.type === 'map' ? 'URL' : 'File'}
                                                </label>
                                                {section.type === 'map' ? (
                                                  <input
                                                    type="url"
                                                    className="form-control form-control-sm"
                                                    value={urls[`${sectionIndex}_${itemIndex}`] || item.filename || ''}
                                                    onChange={(e) => handleUrlChange(sectionIndex, itemIndex, e)}
                                                    placeholder="Enter map URL"
                                                  />
                                                ) : (
                                                  <input
                                                    type="file"
                                                    className="form-control form-control-sm"
                                                    onChange={(e) => handleFileChange(sectionIndex, itemIndex, e)}
                                                    accept={
                                                      section.type === 'images' ? 'image/*' :
                                                      section.type === 'videos' ? 'video/*' :
                                                      section.type === 'ppt' ? '.ppt,.pptx' :
                                                      section.type === 'pdf' ? '.pdf' :
                                                      '*'
                                                    }
                                                  />
                                                )}
                                                {item.filename && !files[`${sectionIndex}_${itemIndex}`] && (
                                                  <small className="text-muted">
                                                    Current: {item.original_name || item.filename}
                                                  </small>
                                                )}
                                              </div>
                                            </div>
                                            <div className="col-md-3">
                                              {item.filename && (
                                                <div className="mb-2">
                                                  <label className="form-label">Current File</label>
                                                  <div className="form-control form-control-sm bg-light">
                                                    {item.original_name || item.filename}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                            <div className="col-md-2">
                                              <div className="mb-2">
                                                <label className="form-label">&nbsp;</label>
                                                <div>
                                                  {item.id && (
                                                    <button
                                                      type="button"
                                                      className="btn btn-danger btn-sm"
                                                      onClick={() => handleDeleteItem(section.id, item.id, sectionIndex, itemIndex)}
                                                    >
                                                      Delete
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </FieldArray>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </FieldArray>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(`/presentations/${id}`)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}

export default PresentationEdit;
