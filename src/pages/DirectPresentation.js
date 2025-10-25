import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getPresentation, recordAnalyticsEvent } from '../api';
import QRCode from 'qrcode.react';
import '../styles/DirectPresentation.css';

function DirectPresentation() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoMuted, setVideoMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [mouseMoveTimer, setMouseMoveTimer] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [isClientMode, setIsClientMode] = useState(false);
  const [videoInteracted, setVideoInteracted] = useState(false);
  
  const videoRef = useRef(null);
  const API_URL = process.env.REACT_APP_API_URL || 'https://wallpresentation.theautochef.com/api';

  // Generate client view URL for QR code
  const generateClientURL = () => {
    // Use production domain for QR codes
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port || (protocol === 'https:' ? '443' : '80');
    
    // For production, use the actual domain without port
    const baseURL = process.env.NODE_ENV === 'production' 
      ? `${protocol}//${hostname}`
      : `${protocol}//${hostname}:${port}`;
    
    const clientViewURL = `${baseURL}/presentations/${id}?mode=client`;
    
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('QR Code URL Generation:', {
        protocol,
        hostname,
        port,
        baseURL,
        clientViewURL,
        currentLocation: window.location.href
      });
    }
    
    return clientViewURL;
  };

  // Current section and item
  const currentSection = presentation?.sections?.[currentSectionIndex] || null;
  const currentItem = currentSection?.items?.[currentItemIndex] || null;

  // Extract client ID from URL query parameters
  const [clientId, setClientId] = useState(null);
  
  useEffect(() => {
    // Get client ID from URL parameters
    const params = new URLSearchParams(location.search);
    const clientIdParam = params.get('client');
    const clientMode = params.get('mode') === 'client';
    
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('URL Parameters:', {
        search: location.search,
        clientIdParam,
        clientMode,
        fullURL: window.location.href
      });
    }
    
    if (clientIdParam) {
      setClientId(clientIdParam);
      if (process.env.NODE_ENV === 'development') {
        console.log('Client ID detected:', clientIdParam);
      }
    }
    
    if (clientMode) {
      setIsClientMode(true);
      setShowControls(false); // Hide controls in client mode
      if (process.env.NODE_ENV === 'development') {
        console.log('Client mode activated - read-only view');
      }
    }
  }, [location]);

  // Initialize 360° panorama viewer when a 3D section is loaded
  useEffect(() => {
    if (currentSection?.type === '3d' && currentItem) {
      console.log('Initializing 360° panorama viewer');
      
      const panoramaContainer = document.querySelector('.panorama-container');
      const panoramaImage = document.getElementById('panoramaImage');
      
      if (!panoramaContainer || !panoramaImage) {
        console.log('Panorama elements not found');
        return;
      }
      
      // Variables for tracking interaction
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let currentX = 0;
      let currentY = 0;
      // let lastX = 0;
      // let lastY = 0;
      let translateX = 0;
      let translateY = 0;
      let scale = 1;
      
      // When image loads, initialize panning functionality
      panoramaImage.onload = () => {
        console.log('Panorama image loaded');
      };
      
      // Mouse events
      const handleMouseDown = (e) => {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        panoramaContainer.style.cursor = 'grabbing';
        e.preventDefault();
      };
      
      const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        currentX = e.clientX - startX;
        currentY = e.clientY - startY;
        
        // Calculate the movement speed based on the distance
        const speedFactor = 0.5;
        translateX = currentX * speedFactor;
        translateY = currentY * speedFactor;
        
        // Apply horizontal wrapping effect for 360° panorama
        // const imageWidth = panoramaImage.width * scale;
        const viewportWidth = panoramaContainer.clientWidth;
        
        // Only allow vertical panning within limits
        translateY = Math.max(Math.min(translateY, viewportWidth / 2), -viewportWidth / 2);
        
        panoramaImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        
        // Store last position for momentum
        // lastX = e.clientX;
        // lastY = e.clientY;
      };
      
      const handleMouseUp = () => {
        isDragging = false;
        panoramaContainer.style.cursor = 'grab';
      };
      
      // Handle mouse wheel for zooming
      const handleWheel = (e) => {
        e.preventDefault();
        
        // Determine zoom direction
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        
        // Calculate new scale with limits
        const newScale = Math.max(0.5, Math.min(3, scale + delta));
        scale = newScale;
        
        // Apply transform with current translation and new scale
        panoramaImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      };
      
      // Touch events for mobile
      const handleTouchStart = (e) => {
        if (e.touches.length !== 1) return;
        
        isDragging = true;
        startX = e.touches[0].clientX - translateX;
        startY = e.touches[0].clientY - translateY;
        e.preventDefault();
      };
      
      const handleTouchMove = (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        
        currentX = e.touches[0].clientX - startX;
        currentY = e.touches[0].clientY - startY;
        
        const speedFactor = 0.5;
        translateX = currentX * speedFactor;
        translateY = currentY * speedFactor;
        
        // Only allow vertical panning within limits
        translateY = Math.max(Math.min(translateY, 200), -200);
        
        panoramaImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        
        // Store touch position for momentum (commented out for now)
        // const touchX = e.touches[0].clientX;
        // const touchY = e.touches[0].clientY;
        e.preventDefault();
      };
      
      const handleTouchEnd = () => {
        isDragging = false;
      };
      
      // Attach event listeners
      panoramaContainer.addEventListener('mousedown', handleMouseDown);
      panoramaContainer.addEventListener('touchstart', handleTouchStart);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleTouchEnd);
      panoramaContainer.addEventListener('wheel', handleWheel, { passive: false });
      
      // Auto-rotation animation to indicate interactivity
      let autoRotateTimer;
      const startAutoRotation = () => {
        if (autoRotateTimer) clearInterval(autoRotateTimer);
        
        let rotationOffset = 0;
        autoRotateTimer = setInterval(() => {
          if (!isDragging) {
            rotationOffset += 0.5;
            translateX = rotationOffset;
            panoramaImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
          }
        }, 30);
      };
      
      // Start auto-rotation after a delay
      setTimeout(startAutoRotation, 1000);
      
      // Clean up function
      return () => {
        console.log('Cleaning up panorama event listeners');
        if (autoRotateTimer) clearInterval(autoRotateTimer);
        
        panoramaContainer.removeEventListener('mousedown', handleMouseDown);
        panoramaContainer.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchend', handleTouchEnd);
        panoramaContainer.removeEventListener('wheel', handleWheel);
      };
    }
  }, [currentSection?.type, currentItem]);

  // Auto-hide controls after inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      
      if (mouseMoveTimer) {
        clearTimeout(mouseMoveTimer);
      }
      
      const timer = setTimeout(() => {
        if (!showSidePanel) { // Don't hide controls if side panel is open
          setShowControls(false);
        }
      }, 3000);
      
      setMouseMoveTimer(timer);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (mouseMoveTimer) {
        clearTimeout(mouseMoveTimer);
      }
    };
  }, [mouseMoveTimer, showSidePanel]);

  // Fetch presentation data
  useEffect(() => {
    const fetchPresentation = async () => {
      try {
        console.log('Fetching presentation data for ID:', id);
        // Directly get presentation data using ID - bypass password
        const response = await getPresentation(id);
        
        if (!response.data || !response.data.sections) {
          throw new Error('Invalid presentation data');
        }
        
        // Process the data
        const processedData = {
          ...response.data,
          // Ensure each section has an items array
          sections: response.data.sections.map(section => ({
            ...section,
            items: section.items || []
          }))
        };
        
        setPresentation(processedData);
        setLoading(false);
        
        // Auto-start fullscreen after loading (only in presenter mode, not client mode)
        if (!isClientMode) {
          setTimeout(() => {
            try {
              if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen()
                  .then(() => setIsFullscreen(true))
                  .catch(e => console.log('Could not enter fullscreen mode:', e));
              }
            } catch (err) {
              console.log('Fullscreen error:', err);
            }
          }, 1000);
        }
        
      } catch (error) {
        console.error('Error fetching presentation:', error);
        setError('Failed to load presentation. Please try again later.');
        setLoading(false);
      }
    };

    fetchPresentation();
    
    // Setup keyboard navigation
    const handleKeyDown = (e) => {
      if (!presentation) return;
      
      switch (e.key) {
        case 'ArrowRight':
        case ' ': // space
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowDown':
          handleNextSection();
          break;
        case 'ArrowUp':
          handlePreviousSection();
          break;
        case 'Escape':
          // Only handle Escape if we initiated fullscreen
          if (isFullscreen && document.fullscreenElement) {
            document.exitFullscreen()
              .then(() => setIsFullscreen(false))
              .catch(e => console.log('Error exiting fullscreen:', e));
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Exit fullscreen when component unmounts
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(e => console.log('Error exiting fullscreen:', e));
      }
    };
  }, [id, isFullscreen]);

  // Record analytics events with client ID
  const [sectionEntryTime, setSectionEntryTime] = useState(Date.now());

  useEffect(() => {
    if (presentation && clientId && currentSection) {
      // Record the time we entered this section
      setSectionEntryTime(Date.now());
      
      // Record a section view event when the section changes
      recordAnalyticsEvent({
        presentation_id: id,
        client_id: clientId,
        section_id: currentSection.id,
        event_type: 'enter_section',
        ts: Date.now(),
        extra: JSON.stringify({
          section_index: currentSectionIndex,
          item_index: currentItemIndex
        })
      }).catch(error => console.error('Failed to record analytics event:', error));
      
      // Setup cleanup function to run when leaving the section
      return () => {
        // Calculate how long they spent on this section
        const duration = Date.now() - sectionEntryTime;
        
        recordAnalyticsEvent({
          presentation_id: id,
          client_id: clientId,
          section_id: currentSection.id,
          event_type: 'leave_section',
          ts: Date.now(),
          duration_ms: duration,
          extra: JSON.stringify({
            section_index: currentSectionIndex,
            item_index: currentItemIndex
          })
        }).catch(error => console.error('Failed to record exit analytics event:', error));
      };
    }
  }, [id, clientId, currentSectionIndex, currentSection]);

  // Synchronization between presenter and client views
  const syncPresentationState = (sectionIndex, itemIndex) => {
    if (presentation && !isClientMode) {
      const syncData = {
        presentationId: presentation.id,
        sectionIndex,
        itemIndex,
        timestamp: Date.now()
      };
      localStorage.setItem(`presentation_sync_${presentation.id}`, JSON.stringify(syncData));
    }
  };

  // Listen for presentation state changes from presenter (client mode only)
  useEffect(() => {
    if (!presentation || !isClientMode) return;

    const handleStorageChange = (e) => {
      if (e.key === `presentation_sync_${presentation.id}`) {
        try {
          const syncData = JSON.parse(e.newValue);
          if (syncData && syncData.presentationId === presentation.id) {
            setCurrentSectionIndex(syncData.sectionIndex);
            setCurrentItemIndex(syncData.itemIndex);
            setVideoInteracted(false); // Reset video interaction when syncing
            console.log('Synced to presenter view:', syncData);
          }
        } catch (error) {
          console.error('Error parsing sync data:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [presentation, isClientMode]);

  // Reset video interaction when section or item changes
  useEffect(() => {
    setVideoInteracted(false);
  }, [currentSectionIndex, currentItemIndex]);

  // Also add window close/unload handling to capture final analytics
  useEffect(() => {
    if (clientId) {
      const handleBeforeUnload = () => {
        if (currentSection) {
          const duration = Date.now() - sectionEntryTime;
          
          // Use sendBeacon API for more reliable analytics on page close
          const analyticsData = {
            presentation_id: id,
            client_id: clientId,
            section_id: currentSection.id,
            event_type: 'presentation_exit',
            data: {
              section_index: currentSectionIndex,
              duration_ms: duration,
              timestamp: Date.now()
            }
          };
          
          // Use sendBeacon for better reliability during page unload
          navigator.sendBeacon(
            `${process.env.REACT_APP_API_URL || 'https://wallpresentation.theautochef.com/api'}/analytics/events/beacon`, 
            JSON.stringify(analyticsData)
          );
        }
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [id, clientId, currentSection, currentSectionIndex, sectionEntryTime]);

  // Navigation functions
  const handleNext = () => {
    if (!presentation) return;
    
    // If there are items in this section and we're not at the last one
    if (currentSection?.items?.length && currentItemIndex < currentSection.items.length - 1) {
      const newItemIndex = currentItemIndex + 1;
      setCurrentItemIndex(newItemIndex);
      syncPresentationState(currentSectionIndex, newItemIndex);
    } 
    // If there are more sections
    else if (currentSectionIndex < presentation.sections.length - 1) {
      const newSectionIndex = currentSectionIndex + 1;
      setCurrentSectionIndex(newSectionIndex);
      setCurrentItemIndex(0);
      syncPresentationState(newSectionIndex, 0);
    }
  };

  const handlePrevious = () => {
    if (!presentation) return;
    
    // If we're not at the first item of this section
    if (currentItemIndex > 0) {
      const newItemIndex = currentItemIndex - 1;
      setCurrentItemIndex(newItemIndex);
      syncPresentationState(currentSectionIndex, newItemIndex);
    } 
    // If there are previous sections
    else if (currentSectionIndex > 0) {
      const newSectionIndex = currentSectionIndex - 1;
      setCurrentSectionIndex(newSectionIndex);
      // Go to the last item of the previous section
      const prevSection = presentation.sections[newSectionIndex];
      const newItemIndex = prevSection.items?.length ? prevSection.items.length - 1 : 0;
      setCurrentItemIndex(newItemIndex);
      syncPresentationState(newSectionIndex, newItemIndex);
    }
  };

  // Pass client ID when navigating sections
  const handleNextSection = () => {
    if (!presentation) return;
    
    // If there are more sections, jump to the next one
    if (currentSectionIndex < presentation.sections.length - 1) {
      const newSectionIndex = currentSectionIndex + 1;
      setCurrentSectionIndex(newSectionIndex);
      setCurrentItemIndex(0); // Start at first item of next section
      syncPresentationState(newSectionIndex, 0);
      
      // Record navigation event with client ID if available
      if (clientId) {
        recordAnalyticsEvent({
          presentation_id: id,
          client_id: clientId,
          section_id: presentation.sections[currentSectionIndex + 1].id,
          event_type: 'enter_section',
          ts: Date.now(),
          extra: JSON.stringify({ 
            direction: 'next_section',
            from_section: currentSectionIndex,
            to_section: currentSectionIndex + 1
          })
        }).catch(error => console.error('Failed to record navigation event:', error));
      }
    }
  };

  const handlePreviousSection = () => {
    if (!presentation) return;
    
    // If there are previous sections, jump to the previous one
    if (currentSectionIndex > 0) {
      const newSectionIndex = currentSectionIndex - 1;
      setCurrentSectionIndex(newSectionIndex);
      setCurrentItemIndex(0); // Start at first item of previous section
      syncPresentationState(newSectionIndex, 0);
    }
  };
  
  // Handle exit (close the window/tab)
  const handleExit = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(e => console.log('Error exiting fullscreen:', e));
    }
    window.close();
    // Fallback if window.close doesn't work
    navigate('/presentations');
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(e => console.log('Error attempting to enable fullscreen:', e));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(e => console.log('Error attempting to exit fullscreen:', e));
    }
  };

  // Handle video controls
  const handleVideoPlayPause = () => {
    if (!videoRef.current) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };
  
  const handleVideoMute = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !videoRef.current.muted;
    setVideoMuted(!videoMuted);
  };
  
  const handleVideoSeek = (e) => {
    if (!videoRef.current) return;
    
    const seekTime = parseFloat(e.target.value);
    videoRef.current.currentTime = seekTime;
    setVideoCurrentTime(seekTime);
  };
  
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    setVideoCurrentTime(videoRef.current.currentTime);
    setVideoDuration(videoRef.current.duration);
  };
  
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "00:00";
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Render file preview based on type
  const renderItemPreview = (item, section, index) => {
    const fileUrl = `${API_URL.replace('/api', '')}/files/${presentation.id}/section_${section.id}/${item.filename}`;
    
    switch(section.type) {
      case 'images':
        return (
          <div className="item-preview image-preview" title={item.original_name || `Image ${index + 1}`}>
            <img 
              src={fileUrl} 
              alt={item.original_name || 'Preview'}
              onError={(e) => {
                e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAESSURBVFiF7ZY9aoUwGIXP+xmFZBI6FbKJdElnR5duXUdu3aO7uEo2yQ7iIshHLGjaFASpP6nt+4AoN7nn6FURSinF/4vbTwHj+A5ZfhQWOL/tIDQK/n4FzpxzRraOAWzbJqpgnmfc5vkvArbwEwTXdRUWMJbhOA6pqoqXnCTJS5fn82PXdToWgmmaaNu2r+FYCLz3WJZlHy7LEPB935fXsQCstTgej7vwaQGstZimCX3f78pRwzC8lPxJgFIKdV2j67qDcKSUUNf1JnwTQCmFpmlwuVwOx79xzlFV1aOE7wCEEEjTFOfz+XD0FuccRVGsIjYjtNbi/S0+FMdaSSmRZRmyLIOUcp3g8RUopRDH8VHGKsFfxg9B2WHdiUdJWQAAAABJRU5ErkJggg=='
              }}
            />
          </div>
        );
      
      case 'videos':
        return (
          <div className="item-preview video-preview" title={item.original_name || `Video ${index + 1}`}>
            <div className="video-thumbnail">
              <div className="video-play-icon">▶</div>
            </div>
          </div>
        );
      
      case 'pdf':
        return (
          <div className="item-preview pdf-preview" title={item.original_name || `Document ${index + 1}`}>
            <div className="pdf-icon">
              <span>PDF</span>
            </div>
          </div>
        );
      
      case 'ppt':
        return (
          <div className="item-preview ppt-preview" title={item.original_name || `Presentation ${index + 1}`}>
            <div className="ppt-icon">
              <span>PPT</span>
            </div>
          </div>
        );
      
      case 'map':
        return (
          <div className="item-preview map-preview" title={item.original_name || `Map ${index + 1}`}>
            <div className="map-icon">
              <span>MAP</span>
            </div>
          </div>
        );
      
      case '3d':
        return (
          <div className="item-preview panorama-preview" title={item.original_name || `360° Image ${index + 1}`}>
            <div className="panorama-icon">
              <span>360°</span>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="item-preview default-preview" title={item.original_name || `Item ${index + 1}`}>
            <div className="file-icon"></div>
          </div>
        );
    }
  };

  // Render content based on section type
  const renderContent = () => {
    if (!currentSection) return null;

    return (
      <>
        {currentSection.type === 'images' && currentItem && (
          <div className="image-container">
            <img 
              src={`${API_URL.replace('/api', '')}/files/${presentation.id}/section_${currentSection.id}/${currentItem.filename}`}
              alt={currentItem.original_name || 'Presentation Image'} 
              className="content-image"
              onError={(e) => {
                console.error('Image failed to load');
                e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAESSURBVFiF7ZY9aoUwGIXP+xmFZBI6FbKJdElnR5duXUdu3aO7uEo2yQ7iIshHLGjaFASpP6nt+4AoN7nn6FURSinF/4vbTwHj+A5ZfhQWOL/tIDQK/n4FzpxzRraOAWzbJqpgnmfc5vkvArbwEwTXdRUWMJbhOA6pqoqXnCTJS5fn82PXdToWgmmaaNu2r+FYCLz3WJZlHy7LEPB935fXsQCstTgej7vwaQGstZimCX3f78pRwzC8lPxJgFIKdV2j67qDcKSUUNf1JnwTQCmFpmlwuVwOx79xzlFV1aOE7wCEEEjTFOfz+XD0FuccRVGsIjYjtNbi/S0+FMdaSSmRZRmyLIOUcp3g8RUopRDH8VHGKsFfxg9B2WHdiUdJWQAAAABJRU5ErkJggg=='
              }}
            />
          </div>
        )}
        
        {currentSection.type === 'videos' && currentItem && (
          <div className="video-container">
            {/* Debug info - completely hidden */}
            <video 
              src={`${API_URL.replace('/api', '')}/files/${presentation.id}/section_${currentSection.id}/${currentItem.filename}`}
              className="content-video"
              ref={videoRef}
              autoPlay={!isClientMode}
              playsInline={true}
              muted={isClientMode}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => {
                setIsVideoPlaying(true);
                setIsVideoActive(true);
                console.log('Video started playing:', { isClientMode, muted: videoRef.current?.muted });
              }}
              onPause={() => {
                setIsVideoPlaying(false);
                console.log('Video paused:', { isClientMode });
              }}
              onEnded={() => {
                setIsVideoPlaying(false);
              }}
              onLoadedMetadata={() => {
                setIsVideoActive(true);
                if (videoRef.current) {
                  setVideoDuration(videoRef.current.duration);
                  console.log('Video loaded:', {
                    src: videoRef.current.src,
                    duration: videoRef.current.duration,
                    muted: videoRef.current.muted,
                    isClientMode,
                    autoplay: !isClientMode
                  });
                  // In client mode, try to play the video after it loads
                  if (isClientMode && videoRef.current) {
                    videoRef.current.play().catch(e => {
                      console.log('Autoplay blocked in client mode, video will play on click');
                    });
                  }
                }
              }}
              onError={(e) => {
                console.error('Video failed to load:', e);
              }}
              onClick={() => {
                // In client mode, video is controlled by presenter - no user interaction needed
                // Only allow interaction in presenter mode
                if (!isClientMode && videoRef.current) {
                  if (videoRef.current.paused) {
                    videoRef.current.play().catch(e => console.log('Video play failed:', e));
                  } else {
                    videoRef.current.pause();
                  }
                }
              }}
              style={{ cursor: !isClientMode ? 'pointer' : 'default' }}
            >
              Your browser does not support the video tag.
            </video>
            {/* Show play button overlay in client mode when video is paused and not interacted - DISABLED */}
            {false && isClientMode && videoRef.current && videoRef.current.paused && !videoInteracted && (
              <div 
                className="video-play-overlay"
                onClick={() => {
                  setVideoInteracted(true);
                  if (videoRef.current) {
                    videoRef.current.play().catch(e => console.log('Video play failed:', e));
                  }
                }}
              >
                <div className="play-button">
                  <i className="fas fa-play"></i>
                </div>
              </div>
            )}
          </div>
        )}
        
        {currentSection.type === 'map' && currentItem && (
          <div className="map-container">
            <iframe 
              src={currentItem.filename}
              className="content-map"
              title="Map"
              allowFullScreen
              frameBorder="0"
              loading="eager"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
        
        {currentSection.type === 'pdf' && currentItem && (
          <div className="pdf-container">
            <iframe 
              src={`${API_URL.replace('/api', '')}/files/${presentation.id}/section_${currentSection.id}/${currentItem.filename}`}
              className="content-pdf"
              title="PDF Document"
              allowFullScreen
              frameBorder="0"
            />
          </div>
        )}
        
        {/* Enhanced 360° panorama viewer */}
        {currentSection.type === '3d' && currentItem && (
          <div className="panorama-container">
            <div className="panorama-viewer">
              <img 
                src={`${API_URL.replace('/api', '')}/files/${presentation.id}/section_${currentSection.id}/${currentItem.filename}`}
                alt="360° Panorama"
                className="panorama-image"
                id="panoramaImage"
              />
              <div className="panorama-instructions">
                <div className="instruction-box">
                  <p>Drag to look around</p>
                  <p>Scroll to zoom in/out</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Improved PowerPoint viewer */}
        {currentSection.type === 'ppt' && currentItem && (
          <div className="ppt-container">
            <div className="ppt-wrapper">
              {/* Primary viewer using Office Online */}
              <iframe 
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                  `${API_URL.replace('/api', '')}/files/${presentation.id}/section_${currentSection.id}/${currentItem.filename}`
                )}`}
                className="content-ppt"
                title="PowerPoint Presentation"
                allowFullScreen
                frameBorder="0"
                onError={(e) => {
                  console.error('Office viewer failed to load:', e);
                  e.target.classList.add('hidden');
                  document.getElementById('fallback-ppt-viewer')?.classList.remove('hidden');
                }}
              />

              {/* Fallback viewer using Google Docs */}
              <iframe 
                id="fallback-ppt-viewer"
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                  `${API_URL.replace('/api', '')}/files/${presentation.id}/section_${currentSection.id}/${currentItem.filename}`
                )}&embedded=true`}
                className="content-ppt hidden"
                title="PowerPoint Presentation (Fallback)"
                allowFullScreen
                frameBorder="0"
              />
            </div>
            <div className="ppt-fallback">
              <p className="ppt-error-message">If the presentation doesn't appear above, you can:</p>
              <div className="ppt-actions">
                <button 
                  className="btn btn-outline-light"
                  onClick={() => {
                    const iframe = document.querySelector('.content-ppt');
                    if (iframe) {
                      const currentSrc = iframe.src;
                      iframe.src = '';
                      setTimeout(() => {
                        iframe.src = currentSrc;
                      }, 10);
                    }
                  }}
                >
                  Reload Viewer
                </button>
                <a 
                  href={`${API_URL.replace('/api', '')}/files/${presentation.id}/section_${currentSection.id}/${currentItem.filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  download
                >
                  Download Presentation
                </a>
                <button
                  className="btn btn-outline-light"
                  onClick={() => {
                    const primary = document.querySelector('.content-ppt');
                    const fallback = document.getElementById('fallback-ppt-viewer');
                    if (primary && fallback) {
                      primary.classList.toggle('hidden');
                      fallback.classList.toggle('hidden');
                    }
                  }}
                >
                  Switch Viewer
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="fullscreen-container">
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading presentation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fullscreen-container">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.close()} className="btn btn-danger">
            <i className="fas fa-times"></i> Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`presentation-container ${isVideoActive ? 'video-active' : ''} ${isClientMode ? 'client-mode' : ''}`}>
      {/* No header in client mode - completely clean view */}

      {/* Menu button with improved icon */}
      <button 
        className={`hamburger-menu-button ${showControls ? 'visible' : ''}`}
        onClick={() => setShowSidePanel(!showSidePanel)}
        title="Open Menu"
      >
        <i className="fas fa-bars"></i>
      </button>
      
      {/* Side Panel with improved styling */}
      <div className={`side-panel ${showSidePanel ? 'open' : ''}`}>
        <div className="side-panel-header">
          <h3 className="side-panel-title">
            <i className="fas fa-presentation"></i> {presentation?.title || 'Presentation'}
          </h3>
          <button 
            className="close-panel-button" 
            onClick={() => setShowSidePanel(false)}
            title="Close Menu"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="side-panel-content">
          {/* List of sections */}
          <div className="side-panel-section">
            <h4><i className="fas fa-layer-group"></i> Sections</h4>
            <ul className="section-list">
              {presentation?.sections?.map((section, index) => (
                <li 
                  key={section.id}
                  className={index === currentSectionIndex ? 'active' : ''}
                  onClick={() => {
                    setCurrentSectionIndex(index);
                    setCurrentItemIndex(0);
                    syncPresentationState(index, 0);
                    // Optionally close the panel after selection on mobile
                    if (window.innerWidth < 768) setShowSidePanel(false);
                  }}
                >
                  <i className={`fas fa-${
                    section.type === 'images' ? 'images' : 
                    section.type === 'videos' ? 'video' : 
                    section.type === 'map' ? 'map-marker-alt' :
                    section.type === 'pdf' ? 'file-pdf' :
                    section.type === 'ppt' ? 'file-powerpoint' :
                    section.type === '3d' ? '3d-rotation' : 'file'
                  } me-2`}></i>
                  {section.heading}
                  {index === currentSectionIndex && (
                    <span className="current-indicator"><i className="fas fa-circle-check"></i></span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Items in current section - WITH PREVIEWS */}
          {currentSection?.items?.length > 0 && (
            <div className="side-panel-section">
              <h4>
                <i className="fas fa-photo-film"></i> 
                Items in {currentSection.heading}
              </h4>
              <ul className="item-list preview-list">
                {currentSection.items.map((item, index) => (
                  <li 
                    key={item.id}
                    className={index === currentItemIndex ? 'active' : ''}
                    onClick={() => {
                      setCurrentItemIndex(index);
                      syncPresentationState(currentSectionIndex, index);
                      // Optionally close the panel after selection on mobile
                      if (window.innerWidth < 768) setShowSidePanel(false);
                    }}
                  >
                    {renderItemPreview(item, currentSection, index)}
                    <span className="item-number">{index + 1}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="side-panel-footer">
            <div className="btn-group w-100 mb-3">
              <button 
                className="btn btn-outline-light"
                onClick={toggleFullscreen}
              >
                <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i> 
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>
              
              <button 
                className="btn btn-danger"
                onClick={handleExit}
              >
                <i className="fas fa-sign-out-alt"></i> Exit
              </button>
            </div>
            
            {/* QR Code Button - Only show in presenter mode */}
            {!isClientMode && (
              <button 
                className="btn btn-info w-100"
                onClick={() => setShowQRCode(true)}
              >
                <i className="fas fa-qrcode me-2"></i> Show QR
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Overlay to close side panel when clicking outside */}
      {showSidePanel && (
        <div className="side-panel-overlay" onClick={() => setShowSidePanel(false)}></div>
      )}
      
      {/* Improved compact header with progress info - hidden in client mode */}
      {!isClientMode && (
        <div className={`presentation-header ${showControls ? 'visible' : ''}`}>
        <div className="header-content">
          <h1 className="presentation-title">
            <i className="fas fa-presentation me-2"></i>
            {presentation?.title || 'Loading...'}
          </h1>
          <div className="presentation-info">
            <span className="badge bg-primary">
              <i className="fas fa-map-marker-alt me-1"></i>
              Section {currentSectionIndex + 1} of {presentation?.sections?.length}
            </span>
            <span className="badge bg-secondary ms-2">
              <i className="fas fa-image me-1"></i>
              Item {currentItemIndex + 1} of {currentSection?.items?.length || 0}
            </span>
          </div>
        </div>
        
        <div className="header-controls">
          <button 
            className="header-button" 
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
          </button>
          
          <button 
            className="header-button header-button-exit" 
            onClick={handleExit}
            title="Exit Presentation"
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
      )}
      
      {/* Full-screen content area */}
      <div className={`presentation-content ${isClientMode ? 'client-content' : ''}`}>
        {renderContent()}
      </div>
      
      {/* Progress bar - hidden in client mode */}
      {!isClientMode && (
        <div className="progress-container">
        <div 
          className="progress-bar" 
          style={{ 
            width: `${(((currentSectionIndex * 100) + 
              (currentItemIndex * 100 / (currentSection?.items?.length || 1))) / 
              presentation.sections.length)}%` 
          }}
        ></div>
        <div className="progress-markers">
          {presentation?.sections?.map((section, index) => (
            <div 
              key={section.id} 
              className={`progress-marker ${index <= currentSectionIndex ? 'completed' : ''}`}
              style={{ left: `${(index / (presentation.sections.length - 1)) * 100}%` }}
              onClick={() => {
                setCurrentSectionIndex(index);
                setCurrentItemIndex(0);
                syncPresentationState(index, 0);
              }}
              title={section.heading}
            ></div>
          ))}
        </div>
      </div>
      )}
      
      {/* Enhanced navigation controls with icons */}
      <div className={`navigation-controls ${showControls ? 'visible' : ''}`}>
        {/* Section navigation buttons - always visible but dimmed when not applicable */}
        <button 
          onClick={handlePreviousSection}
          disabled={currentSectionIndex === 0}
          className="nav-button section-nav-button"
          title="Previous Section"
        >
          <i className="fas fa-angle-double-left"></i>
        </button>
        
        <button 
          onClick={handlePrevious}
          disabled={currentSectionIndex === 0 && currentItemIndex === 0}
          className="nav-button"
          title="Previous Item"
        >
          <i className="fas fa-angle-left"></i>
        </button>
        
        {/* Video controls - visible when video is active, not just playing */}
        {currentSection?.type === 'videos' && (
          <div className={`video-controls ${isVideoActive ? 'visible' : ''}`}>
            {/* Debug info - completely hidden */}
            <button 
              className="video-control-btn" 
              onClick={handleVideoPlayPause}
              title={isVideoPlaying ? "Pause" : "Play"}
            >
              <i className={`fas ${isVideoPlaying ? 'fa-pause' : 'fa-play'}`}></i>
            </button>
            
            <div className="video-progress">
              <span className="video-time">{formatTime(videoCurrentTime)}</span>
              <input
                type="range"
                className="video-seek"
                min="0"
                max={videoDuration || 0}
                step="0.01"
                value={videoCurrentTime}
                onChange={handleVideoSeek}
              />
              <span className="video-time">{formatTime(videoDuration)}</span>
            </div>
            
            <button 
              className="video-control-btn" 
              onClick={handleVideoMute}
              title={videoMuted ? "Unmute" : "Mute"}
            >
              <i className={`fas ${videoMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
            </button>
          </div>
        )}
        
        <button 
          onClick={handleNext}
          disabled={
            currentSectionIndex === presentation.sections.length - 1 && 
            currentItemIndex === (currentSection?.items?.length - 1 || 0)
          }
          className="nav-button"
          title="Next Item"
        >
          <i className="fas fa-angle-right"></i>
        </button>
        
        <button 
          onClick={handleNextSection}
          disabled={currentSectionIndex >= presentation.sections.length - 1}
          className="nav-button section-nav-button"
          title="Next Section"
        >
          <i className="fas fa-angle-double-right"></i>
        </button>
      </div>

      {/* QR Code Modal */}
      {showQRCode && (
        <div className="qr-modal-overlay" onClick={() => setShowQRCode(false)}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qr-modal-header">
              <h4><i className="fas fa-qrcode me-2"></i>Share Presentation</h4>
              <button 
                className="btn-close" 
                onClick={() => setShowQRCode(false)}
                aria-label="Close"
              ></button>
            </div>
            <div className="qr-modal-body">
              <div className="qr-code-container">
                <QRCode 
                  value={generateClientURL()} 
                  size={256}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <div className="qr-info">
                <p className="mb-2">
                  <i className="fas fa-info-circle me-2"></i>
                  Scan this QR code to view the presentation in read-only mode
                </p>
                <div className="input-group">
                  <input 
                    type="text" 
                    className="form-control" 
                    value={generateClientURL()} 
                    readOnly 
                  />
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(generateClientURL());
                      alert('URL copied to clipboard!');
                    }}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DirectPresentation;
