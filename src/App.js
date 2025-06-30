import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [requirements, setRequirements] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [events, setEvents] = useState([]);
  const [plan, setPlan] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [filesCreated, setFilesCreated] = useState([]);
  const [deploymentResult, setDeploymentResult] = useState(null);
  const [error, setError] = useState(null);
  const eventsEndRef = useRef(null);

  // Auto-scroll to the bottom of events
  useEffect(() => {
    if (eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events]);

  const generateCode = async () => {
    if (!requirements.trim()) {
      setError('Please enter requirements');
      return;
    }
  
    console.log('Starting generation...');
    setIsGenerating(true);
    setEvents([]);
    setPlan('');
    setWebsiteName('');
    setFilesCreated([]);
    setDeploymentResult(null);
    setError(null);
  
    try {
      console.log('Making fetch request...');
      const response = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requirements }),
      });
  
      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      console.log('Starting to read stream...');
      let chunkCount = 0;
      
      while (true) {
        const { done, value } = await reader.read();
        console.log(`Chunk ${++chunkCount}:`, { done, valueLength: value?.length });
        
        if (done) {
          console.log('Stream finished');
          break;
        }
        
        const text = decoder.decode(value);
        console.log('Received text:', text);
        
        const lines = text.split('\n').filter(line => line.trim());
        console.log('Parsed lines:', lines);
        
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            console.log('Parsed event:', event);
            
            // Add to events log
            setEvents(prev => [...prev, event]);
            
            // Handle specific event types
            handleEvent(event);
          } catch (e) {
            console.error('Error parsing event:', line, e);
          }
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEvent = (event) => {
    switch (event.type) {
      case 'plan':
        setPlan(event.data);
        break;
      case 'website_name':
        setWebsiteName(event.data);
        break;
      case 'file_created':
        setFilesCreated(prev => [...prev, event.data.path]);
        break;
      case 'deployment_success':
        setDeploymentResult({
          success: true,
          url: event.data.live_url,
          siteId: event.data.site_id,
          tokenCount: event.data.token_count
        });
        break;
      case 'deployment_failed':
      case 'deployment_error':
        setDeploymentResult({
          success: false,
          message: event.data.message,
          tokenCount: event.data.token_count
        });
        break;
      case 'error':
        setError(event.data.message);
        break;
      default:
        // Other events are just logged
        break;
    }
  };

  const retryDeployment = () => {
    // Implement retry logic here
    alert('Retry functionality would be implemented here');
  };

  return (
    <div className="app-container">
      <h1>LLM Code Generator</h1>
      
      <div className="input-section">
        <h2>Enter Your Requirements</h2>
        <textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder="Describe the application you want to build..."
          rows={5}
          disabled={isGenerating}
        />
        <button 
          onClick={generateCode} 
          disabled={isGenerating}
          className={isGenerating ? 'generating' : ''}
        >
          {isGenerating ? 'Generating...' : 'Generate Code'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}

      {plan && (
        <div className="plan-section">
          <h2>Project Plan</h2>
          <pre>{plan}</pre>
        </div>
      )}

      {websiteName && (
        <div className="website-name">
          <h3>Project Name: {websiteName}</h3>
        </div>
      )}

      {filesCreated.length > 0 && (
        <div className="files-section">
          <h2>Files Created ({filesCreated.length})</h2>
          <ul>
            {filesCreated.map((file, index) => (
              <li key={index}>{file}</li>
            ))}
          </ul>
        </div>
      )}

      {deploymentResult && (
        <div className={`deployment-result ${deploymentResult.success ? 'success' : 'failure'}`}>
          <h2>Deployment {deploymentResult.success ? 'Successful' : 'Failed'}</h2>
          
          {deploymentResult.success ? (
            <>
              <p><strong>Live URL:</strong> <a href={deploymentResult.url} target="_blank" rel="noopener noreferrer">{deploymentResult.url}</a></p>
              <p><strong>Site ID:</strong> {deploymentResult.siteId}</p>
            </>
          ) : (
            <>
              <p>{deploymentResult.message}</p>
              <button onClick={retryDeployment}>Retry Deployment</button>
            </>
          )}
          
          <p><strong>Token Count:</strong> {deploymentResult.tokenCount.toLocaleString()}</p>
        </div>
      )}

      {events.length > 0 && (
        <div className="events-log">
          <h2>Event Log</h2>
          <div className="events-container">
            {events.map((event, index) => (
              <div key={index} className={`event-item event-${event.type}`}>
                <span className="event-type">{event.type}</span>
                <span className="event-data">
                  {typeof event.data === 'object' 
                    ? JSON.stringify(event.data) 
                    : event.data}
                </span>
              </div>
            ))}
            <div ref={eventsEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;