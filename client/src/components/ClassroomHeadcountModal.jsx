import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, RefreshCw, CheckCircle2, AlertTriangle, Upload, X, ZoomIn, ZoomOut, Maximize2, ShieldCheck, Eye, Sparkles, Plus, Trash2, SwitchCamera, Video } from 'lucide-react';

export const ClassroomHeadcountModal = ({
    isOpen,
    onClose,
    roomId,
    roomNumber,
    roomName,
    periodId,
    otpPresentCount = 0,
    onAuditSaved
}) => {
    // Camera streaming states
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [availableCameras, setAvailableCameras] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // AI Detection states
    const [isProcessing, setIsProcessing] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [detectedBoxes, setDetectedBoxes] = useState([]);
    const [visualCount, setVisualCount] = useState(0);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [auditStatus, setAuditStatus] = useState(null);
    const [existingAudit, setExistingAudit] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.25);
    const [detectionWarning, setDetectionWarning] = useState(null);
    const [detectionMode, setDetectionMode] = useState('face'); // 'face' (YOLOv8m-Face) or 'person' (YOLOv8m Person)
    const [activeModelName, setActiveModelName] = useState('YOLOv8m-Face (Classroom High Precision)');

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);

    // Check if user is on mobile or laptop/desktop
    const checkIsMobile = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
    };

    // 1. Detect device type on mount
    useEffect(() => {
        if (!isOpen) return;
        setIsMobile(checkIsMobile());
    }, [isOpen]);

    // 2. Fetch latest audit for this room on open
    useEffect(() => {
        if (!isOpen || !roomId) return;

        const fetchLatestAudit = async () => {
            try {
                const token = localStorage.getItem('fxec_token');
                const res = await fetch(`/api/headcount/latest/${roomId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.hasAudit && data.audit) {
                    setExistingAudit(data.audit);
                    setVisualCount(data.audit.visual_count);
                    setDetectedBoxes(data.audit.boxes_json || []);
                    setCapturedImage(data.audit.image_url);
                } else {
                    setExistingAudit(null);
                    setCapturedImage(null);
                    setDetectedBoxes([]);
                    setVisualCount(0);
                }
            } catch (err) {
                console.error('Failed to load existing audit:', err);
            }
        };

        fetchLatestAudit();
    }, [isOpen, roomId]);

    // 3. Keep videoRef.srcObject synced whenever stream or camera state changes
    useEffect(() => {
        if (isCameraActive && videoRef.current && streamRef.current) {
            if (videoRef.current.srcObject !== streamRef.current) {
                videoRef.current.srcObject = streamRef.current;
            }
            videoRef.current.play()
                .then(() => setIsVideoReady(true))
                .catch(e => console.warn('Play attempt:', e));
        }
    }, [isCameraActive, selectedDeviceId]);

    // 4. Start Camera Stream (Bulletproof for Laptop and Mobile)
    const startCamera = async (deviceIdToUse) => {
        try {
            stopCamera();
            setIsVideoReady(false);
            setDetectionWarning(null);

            const mobile = checkIsMobile();
            setIsMobile(mobile);

            let constraints;
            if (deviceIdToUse) {
                constraints = { video: { deviceId: { exact: deviceIdToUse } }, audio: false };
            } else if (mobile) {
                // Mobile default: back / environment camera
                constraints = { video: { facingMode: { ideal: 'environment' } }, audio: false };
            } else {
                // Laptop default: simplest, most universal constraint for webcams
                constraints = { video: true, audio: false };
            }

            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (err1) {
                console.warn('Initial camera constraints failed, attempting fallback to basic { video: true }:', err1);
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }

            streamRef.current = stream;

            // Immediately attach to video element
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.muted = true;
                try {
                    await videoRef.current.play();
                    setIsVideoReady(true);
                } catch (playErr) {
                    console.warn('Direct video play error:', playErr);
                }
            }

            setIsCameraActive(true);
            setCapturedImage(null);
            setDetectedBoxes([]);

            // Enumerate devices now that user has explicitly granted camera access
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter(d => d.kind === 'videoinput');
                setAvailableCameras(videoInputs);

                // Set selected device ID if available
                const currentTrack = stream.getVideoTracks()[0];
                if (currentTrack) {
                    const settings = currentTrack.getSettings ? currentTrack.getSettings() : {};
                    if (settings.deviceId) {
                        setSelectedDeviceId(settings.deviceId);
                    }
                }
            } catch (enumErr) {
                console.warn('Error enumerating devices after stream start:', enumErr);
            }
        } catch (err) {
            console.error('Camera access error:', err);
            alert('Unable to open camera: ' + (err.message || 'Please check device camera permissions'));
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
        setIsVideoReady(false);
    };

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    // Switch to Next Available Camera
    const handleSwitchCamera = () => {
        if (availableCameras.length <= 1) return;
        const currentIndex = availableCameras.findIndex(c => c.deviceId === selectedDeviceId);
        const nextIndex = (currentIndex + 1) % availableCameras.length;
        const nextDev = availableCameras[nextIndex];
        setSelectedDeviceId(nextDev.deviceId);
        startCamera(nextDev.deviceId);
    };

    // 5. Capture & Run Real YOLO AI Detection
    const handleCaptureFromCamera = async () => {
        if (!videoRef.current) return;
        const video = videoRef.current;

        // Ensure video is playing and ready
        if (video.videoWidth === 0 || video.readyState < 2) {
            await new Promise(resolve => setTimeout(resolve, 350));
        }

        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;

        if (width === 0 || height === 0) {
            alert('Camera is still loading frames. Please ensure your webcam feed is visible on screen, then click capture.');
            return;
        }

        setIsProcessing(true);
        setDetectionWarning(null);

        const offscreen = document.createElement('canvas');
        offscreen.width = width;
        offscreen.height = height;
        const ctx = offscreen.getContext('2d');
        ctx.drawImage(video, 0, 0, width, height);

        // Frame Brightness Check to prevent pitch-black camera bugs
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 120;
        testCanvas.height = 90;
        const testCtx = testCanvas.getContext('2d');
        testCtx.drawImage(offscreen, 0, 0, 120, 90);
        const sampleData = testCtx.getImageData(0, 0, 120, 90).data;
        let totalBrightness = 0;
        for (let i = 0; i < sampleData.length; i += 4) {
            totalBrightness += (sampleData[i] * 0.299 + sampleData[i+1] * 0.587 + sampleData[i+2] * 0.114);
        }
        const avgBrightness = totalBrightness / (sampleData.length / 4);

        if (avgBrightness < 18) {
            setIsProcessing(false);
            setDetectionWarning('Camera image is pitch black or lens/privacy shutter is covered. Please check lighting or switch cameras.');
            alert('⚠️ The captured frame is completely dark / black! If you are on a laptop, please make sure your webcam physical privacy shutter is open, or switch cameras using the camera selector.');
            return;
        }

        const dataUrl = offscreen.toDataURL('image/jpeg', 0.92);
        stopCamera();
        setCapturedImage(dataUrl);

        // Run Real YOLOv8 AI Detection via Node.js
        await executeYoloDetection(dataUrl);
    };

    // 6. Handle Uploaded Image File
    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setDetectionWarning(null);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataUrl = event.target.result;
            setCapturedImage(dataUrl);
            await executeYoloDetection(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    // 7. Call Real YOLOv8m ONNX Backend Detection (Zero Python)
    const executeYoloDetection = async (dataUrl, modeToUse = detectionMode, threshToUse = confidenceThreshold) => {
        setIsProcessing(true);
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('/api/headcount/detect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    imageData: dataUrl,
                    threshold: threshToUse,
                    mode: modeToUse
                })
            });

            const data = await res.json();

            if (data.isDark) {
                setDetectionWarning(data.warning || 'Captured image is too dark. 0 students detected.');
                setDetectedBoxes([]);
                setVisualCount(0);
                renderAnnotatedCanvas(dataUrl, []);
                return;
            }

            if (data.success && Array.isArray(data.boxes)) {
                setDetectedBoxes(data.boxes);
                setVisualCount(data.count);
                if (data.modelUsed) setActiveModelName(data.modelUsed);
                renderAnnotatedCanvas(dataUrl, data.boxes);
            } else {
                throw new Error(data.error || 'YOLO detection failed');
            }
        } catch (err) {
            console.error('YOLO detection API failed:', err);
            setDetectedBoxes([]);
            setVisualCount(0);
            renderAnnotatedCanvas(dataUrl, []);
        } finally {
            setIsProcessing(false);
        }
    };

    // 8. Render Crisp Neon Green Square Bounding Boxes on Canvas (#00FF66)
    const renderAnnotatedCanvas = (imageSrc, boxes) => {
        if (!canvasRef.current || !imageSrc) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Draw crisp neon green boxes with drop shadow
            boxes.forEach((box, index) => {
                ctx.shadowColor = 'rgba(0, 255, 102, 0.7)';
                ctx.shadowBlur = 8;
                ctx.strokeStyle = '#00FF66'; // Neon Green YOLO Square
                ctx.lineWidth = Math.max(2.5, img.width * 0.0035);

                ctx.strokeRect(box.x, box.y, box.width, box.height);

                ctx.shadowBlur = 0;

                const fontSize = Math.max(12, Math.floor(box.width * 0.32));
                ctx.font = `bold ${fontSize}px sans-serif`;
                const text = `#${index + 1}`;
                const textWidth = ctx.measureText(text).width;
                const pad = 4;

                ctx.fillStyle = '#00FF66';
                ctx.fillRect(box.x, Math.max(0, box.y - fontSize - pad * 2), textWidth + pad * 2, fontSize + pad * 2);

                ctx.fillStyle = '#0B3064';
                ctx.fillText(text, box.x + pad, Math.max(fontSize, box.y - pad));
            });
        };
        img.src = imageSrc;
    };

    useEffect(() => {
        if (capturedImage) {
            renderAnnotatedCanvas(capturedImage, detectedBoxes);
        }
    }, [capturedImage, detectedBoxes]);

    // 9. Interactive Manual Correction: Click Canvas to Add or Remove Student Box
    const handleCanvasClick = (e) => {
        if (!canvasRef.current || isCameraActive) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;

        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        const clickedIndex = detectedBoxes.findIndex(box => 
            clickX >= box.x && clickX <= box.x + box.width &&
            clickY >= box.y && clickY <= box.y + box.height
        );

        if (clickedIndex >= 0) {
            const updated = detectedBoxes.filter((_, i) => i !== clickedIndex);
            updated.forEach((b, i) => b.label = `#${i + 1}`);
            setDetectedBoxes(updated);
            setVisualCount(updated.length);
        } else {
            const boxSize = Math.max(32, canvasRef.current.width * 0.045);
            const newBox = {
                x: Math.round(clickX - boxSize / 2),
                y: Math.round(clickY - boxSize / 2),
                width: Math.round(boxSize),
                height: Math.round(boxSize),
                confidence: 0.99,
                label: `#${detectedBoxes.length + 1}`
            };
            const updated = [...detectedBoxes, newBox];
            setDetectedBoxes(updated);
            setVisualCount(updated.length);
        }
    };

    // 10. Save Audit to Backend (1-Hour Retention)
    const handleSaveAudit = async () => {
        if (!capturedImage || !canvasRef.current) return;
        setIsSaving(true);
        try {
            const token = localStorage.getItem('fxec_token');
            const annotatedDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.90);

            const res = await fetch('/api/headcount/audit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    roomId,
                    periodId,
                    otpCount: otpPresentCount,
                    visualCount,
                    imageData: annotatedDataUrl,
                    boxes: detectedBoxes
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setAuditStatus('saved');
                if (onAuditSaved) {
                    onAuditSaved({
                        auditId: data.auditId,
                        visualCount,
                        otpCount: otpPresentCount,
                        matchStatus: data.matchStatus,
                        imageUrl: data.imageUrl
                    });
                }
                setTimeout(() => setAuditStatus(null), 4000);
            } else {
                alert(data.error || 'Failed to save headcount audit');
            }
        } catch (e) {
            console.error('Save audit error:', e);
            alert('Failed to connect to backend to save audit.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const discrepancy = Number(otpPresentCount) - Number(visualCount);
    const isMatch = Math.abs(discrepancy) <= 2;
    const isProxyAlert = discrepancy > 2;

    return (
        <div className="aero-modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
            <div 
                className="aero-modal-card headcount-audit-modal" 
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '960px', width: '95vw', maxHeight: '92vh', overflowY: 'auto', padding: '22px' }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #136CFC 0%, #0B3064 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                            <Camera size={22} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '1.15rem' }}>
                                AI Classroom Headcount & Face Audit (YOLO)
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)' }}>
                                Room {roomNumber || roomId} ({roomName || 'Classroom'}) • Period {periodId || 1} • Saved on server for 1 hour
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#0369A1', background: '#E0F2FE', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>
                            {isMobile ? '📱 Mobile Mode (Back Camera Priority)' : '💻 Laptop Mode (Webcam Priority)'}
                        </span>

                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="aero-close-btn"
                            style={{ border: 'none', background: '#F1F5F9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <X size={18} color="var(--text-sub)" />
                        </button>
                    </div>
                </div>

                {/* Audit Comparison Status Pill Banner */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                    {/* Live OTP Count */}
                    <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#0284C7', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                            {otpPresentCount}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: '#0369A1', fontWeight: 700, textTransform: 'uppercase' }}>OTP Submitted</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0C4A6E' }}>{otpPresentCount} Students Verified</div>
                        </div>
                    </div>

                    {/* AI Visual Count */}
                    <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#16A34A', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                            {visualCount}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 700, textTransform: 'uppercase' }}>YOLO Vision Count</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#14532D' }}>{visualCount} Faces Detected</div>
                        </div>
                    </div>

                    {/* Fidelity / Proxy Anomaly Status */}
                    <div style={{ 
                        background: isMatch ? '#F0FDF4' : (isProxyAlert ? '#FEF2F2' : '#FFFBEB'), 
                        border: `1.5px solid ${isMatch ? '#86EFAC' : (isProxyAlert ? '#FCA5A5' : '#FDE68A')}`, 
                        borderRadius: '12px', 
                        padding: '12px 16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px' 
                    }}>
                        {isMatch ? (
                            <CheckCircle2 size={28} color="#16A34A" />
                        ) : (
                            <AlertTriangle size={28} color={isProxyAlert ? '#DC2626' : '#D97706'} />
                        )}
                        <div>
                            <div style={{ fontSize: '0.72rem', color: isMatch ? '#15803D' : (isProxyAlert ? '#B91C1C' : '#B45309'), fontWeight: 800, textTransform: 'uppercase' }}>
                                {isMatch ? 'Audit Confirmed' : (isProxyAlert ? 'Proxy Discrepancy Alert' : 'Headcount Variance')}
                            </div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: isMatch ? '#14532D' : (isProxyAlert ? '#7F1D1D' : '#78350F') }}>
                                {isMatch 
                                    ? '100% Fidelity • No Proxy Found' 
                                    : (isProxyAlert 
                                        ? `${discrepancy} Potential Ghost Submissions!` 
                                        : `${Math.abs(discrepancy)} seated without OTP`)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Model Mode & Power Selector */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '8px 14px', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={16} color="#136CFC" />
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--dark-blue)' }}>AI Headcount Engine:</span>
                        <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0', padding: '3px', borderRadius: '8px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setDetectionMode('face');
                                    if (capturedImage) executeYoloDetection(capturedImage, 'face');
                                }}
                                style={{
                                    padding: '5px 12px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: detectionMode === 'face' ? '#136CFC' : 'transparent',
                                    color: detectionMode === 'face' ? '#FFF' : '#475569',
                                    boxShadow: detectionMode === 'face' ? '0 2px 6px rgba(19, 108, 252, 0.3)' : 'none'
                                }}
                            >
                                👤 YOLOv8m-Face (103MB High Precision)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setDetectionMode('person');
                                    if (capturedImage) executeYoloDetection(capturedImage, 'person');
                                }}
                                style={{
                                    padding: '5px 12px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: detectionMode === 'person' ? '#136CFC' : 'transparent',
                                    color: detectionMode === 'person' ? '#FFF' : '#475569',
                                    boxShadow: detectionMode === 'person' ? '0 2px 6px rgba(19, 108, 252, 0.3)' : 'none'
                                }}
                            >
                                🧍 YOLOv8m-Person (Full Body)
                            </button>
                        </div>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        Active Model: <strong style={{ color: '#0F172A' }}>{activeModelName}</strong>
                    </div>
                </div>

                {/* Dark Lens / Camera Warning Banner */}
                {detectionWarning && (
                    <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#991B1B', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.80rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={18} color="#DC2626" />
                        <span>{detectionWarning}</span>
                    </div>
                )}

                {/* Camera / Image Display Viewport */}
                <div style={{ position: 'relative', width: '100%', minHeight: '380px', background: '#0F172A', borderRadius: '14px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    
                    {/* ALWAYS-MOUNTED Video Element (Ensures ref.current is NEVER null) */}
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted
                        onLoadedMetadata={() => setIsVideoReady(true)}
                        onCanPlay={() => setIsVideoReady(true)}
                        onPlaying={() => setIsVideoReady(true)}
                        style={{ 
                            display: isCameraActive ? 'block' : 'none', 
                            width: '100%', 
                            maxHeight: '480px', 
                            objectFit: 'contain' 
                        }}
                    />

                    {/* Camera Active Overlays */}
                    {isCameraActive && (
                        <>
                            {/* Live Badge */}
                            <div style={{ position: 'absolute', top: '15px', left: '15px', color: '#00FF66', fontSize: '0.78rem', background: 'rgba(0,0,0,0.75)', padding: '5px 12px', borderRadius: '6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite' }} />
                                LIVE CAMERA ACTIVE
                            </div>

                            {/* Camera Switcher Bar */}
                            <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
                                {availableCameras.length > 1 && (
                                    <select
                                        value={selectedDeviceId}
                                        onChange={(e) => {
                                            setSelectedDeviceId(e.target.value);
                                            startCamera(e.target.value);
                                        }}
                                        style={{ background: 'rgba(0,0,0,0.8)', color: '#FFF', border: '1px solid #38BDF8', borderRadius: '6px', padding: '5px 10px', fontSize: '0.74rem', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        {availableCameras.map((cam, idx) => (
                                            <option key={cam.deviceId || idx} value={cam.deviceId}>
                                                {cam.label || `Camera ${idx + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {availableCameras.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={handleSwitchCamera}
                                        style={{ background: 'rgba(0,0,0,0.8)', color: '#38BDF8', border: '1px solid #38BDF8', borderRadius: '6px', padding: '5px 10px', fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                        title="Switch to next camera"
                                    >
                                        <SwitchCamera size={14} />
                                        <span>Switch Cam</span>
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {/* Processed Canvas Display with Green Bounding Boxes */}
                    {!isCameraActive && capturedImage && (
                        <div style={{ width: '100%', maxHeight: '520px', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            <canvas 
                                ref={canvasRef} 
                                onClick={handleCanvasClick}
                                style={{ 
                                    width: '100%', 
                                    maxHeight: '520px', 
                                    objectFit: 'contain',
                                    cursor: 'crosshair',
                                    transform: `scale(${zoomLevel})`,
                                    transformOrigin: 'center center',
                                    transition: 'transform 0.15s ease'
                                }} 
                                title="Click on an empty face to ADD a student box, or click an existing box to REMOVE it."
                            />
                        </div>
                    )}

                    {/* Empty State: Prompt to open camera or upload */}
                    {!isCameraActive && !capturedImage && (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                                <Camera size={32} />
                            </div>
                            <div style={{ fontWeight: 700, color: '#F1F5F9', fontSize: '1.05rem', marginBottom: '6px' }}>
                                Take or Upload Classroom Front Photo
                            </div>
                            <p style={{ fontSize: '0.82rem', color: '#94A3B8', maxWidth: '440px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
                                Aim your device from the faculty podium towards student rows. The YOLO AI vision engine will detect faces, draw neon green boxes, and verify headcount against submitted OTPs.
                            </p>
                            
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => startCamera(selectedDeviceId)}
                                    className="aero-gloss-btn"
                                    style={{ width: 'auto', padding: '10px 22px', fontSize: '0.86rem' }}
                                >
                                    <Camera size={16} style={{ marginRight: '6px' }} />
                                    <span>Start Camera {isMobile ? '(Rear Cam)' : '(Webcam)'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="fx-btn-outline"
                                    style={{ width: 'auto', padding: '10px 20px', fontSize: '0.86rem', color: '#F8FAFC', borderColor: 'rgba(255,255,255,0.25)' }}
                                >
                                    <Upload size={16} style={{ marginRight: '6px' }} />
                                    <span>Upload Classroom Photo</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Processing Overlay */}
                    {isProcessing && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(11, 48, 100, 0.88)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#FFF', zIndex: 20 }}>
                            <RefreshCw size={36} className="fa-spin" color="#00FF66" />
                            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#00FF66' }}>
                                YOLOv8 AI Face Detection in Progress...
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#E2E8F0' }}>
                                Analyzing students across front, middle and back rows
                            </div>
                        </div>
                    )}
                </div>

                {/* Hidden File Input */}
                <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    style={{ display: 'none' }} 
                />

                {/* Interactive Controls & Action Buttons */}
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    
                    {/* Left: Viewport Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {isCameraActive ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handleCaptureFromCamera}
                                    className="aero-gloss-btn"
                                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', padding: '10px 22px', fontSize: '0.88rem' }}
                                >
                                    <Camera size={16} style={{ marginRight: '6px' }} />
                                    <span>Capture & Run YOLO Audit</span>
                                </button>
                                
                                {availableCameras.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={handleSwitchCamera}
                                        className="fx-btn-outline"
                                        style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                                        title="Switch camera device"
                                    >
                                        <SwitchCamera size={14} style={{ marginRight: '5px' }} />
                                        <span>Switch Camera</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={stopCamera}
                                    className="fx-btn-outline"
                                    style={{ padding: '8px 14px', fontSize: '0.78rem', color: '#EF4444', borderColor: '#FCA5A5' }}
                                >
                                    <span>Cancel</span>
                                </button>
                            </>
                        ) : capturedImage ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => startCamera(selectedDeviceId)}
                                    className="fx-btn-outline"
                                    style={{ padding: '8px 14px', fontSize: '0.80rem' }}
                                >
                                    <Camera size={14} style={{ marginRight: '6px' }} />
                                    <span>Retake Photo</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="fx-btn-outline"
                                    style={{ padding: '8px 14px', fontSize: '0.80rem' }}
                                >
                                    <Upload size={14} style={{ marginRight: '6px' }} />
                                    <span>Upload Different Image</span>
                                </button>

                                {/* Zoom Controls */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F1F5F9', borderRadius: '8px', padding: '2px 6px' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.2))} 
                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}
                                        title="Zoom Out"
                                    >
                                        <ZoomOut size={15} color="var(--text-sub)" />
                                    </button>
                                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--dark-blue)', minWidth: '36px', textAlign: 'center' }}>
                                        {Math.round(zoomLevel * 100)}%
                                    </span>
                                    <button 
                                        type="button" 
                                        onClick={() => setZoomLevel(prev => Math.min(2.0, prev + 0.2))} 
                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}
                                        title="Zoom In"
                                    >
                                        <ZoomIn size={15} color="var(--text-sub)" />
                                    </button>
                                </div>

                                <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginLeft: '4px' }}>
                                    💡 Tip: Click any face to add or remove a green box.
                                </span>
                            </>
                        ) : null}
                    </div>

                    {/* Right: Save & Confirm Audit Button */}
                    {capturedImage && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {auditStatus === 'saved' && (
                                <span style={{ color: '#16A34A', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle2 size={16} /> Audit Saved (Valid 1 Hr)
                                </span>
                            )}

                            <button
                                type="button"
                                onClick={handleSaveAudit}
                                disabled={isSaving}
                                className="aero-gloss-btn"
                                style={{ width: 'auto', padding: '10px 24px', fontSize: '0.88rem' }}
                            >
                                <ShieldCheck size={16} style={{ marginRight: '6px' }} />
                                <span>{isSaving ? 'Saving Audit to Server...' : 'Confirm & Save Audit'}</span>
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
