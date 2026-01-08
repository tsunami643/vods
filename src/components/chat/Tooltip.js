import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function Tooltip({ children, text, imageUrl = null, className = '' }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowOffset, setArrowOffset] = useState(50);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!containerRef.current || !tooltipRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    let top = containerRect.top - tooltipRect.height - 6;
    let left = containerRect.left + (containerRect.width - tooltipRect.width) / 2;
    
    const elementCenter = containerRect.left + containerRect.width / 2;
    let arrowLeft = 50;
    
    if (left < 4) {
      const adjustment = 4 - left;
      left = 4;
      arrowLeft = ((elementCenter - left) / tooltipRect.width) * 100;
    }
    
    if (left + tooltipRect.width > window.innerWidth - 4) {
      const newLeft = window.innerWidth - 4 - tooltipRect.width;
      arrowLeft = ((elementCenter - newLeft) / tooltipRect.width) * 100;
      left = newLeft;
    }
    
    arrowLeft = Math.max(10, Math.min(90, arrowLeft));
    
    if (top < 4) {
      top = containerRect.bottom + 6;
    }
    
    setPosition({ top, left });
    setArrowOffset(arrowLeft);
  }, []);

  useEffect(() => {
    if (visible) {
      updatePosition();
    }
  }, [visible, updatePosition]);

  useEffect(() => {
    if (!visible) return;
    
    const handleUpdate = () => updatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [visible, updatePosition]);

  const showTooltip = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setVisible(true);
  };

  const hideTooltip = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, 100);
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (visible) {
      setVisible(false);
    } else {
      showTooltip();
      setTimeout(() => setVisible(false), 2000);
    }
  };

  useEffect(() => {
    if (!visible) return;
    
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setVisible(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [visible]);

  return (
    <span
      ref={containerRef}
      className={`tooltip-container ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onClick={handleClick}
    >
      {children}
      {visible && (
        <span
          ref={tooltipRef}
          className={`tooltip-popup ${imageUrl ? 'tooltip-with-image' : ''}`}
          style={{ 
            top: position.top, 
            left: position.left,
            '--arrow-offset': `${arrowOffset}%`
          }}
        >
          {imageUrl && <img src={imageUrl} alt={text} className="tooltip-image" />}
          <span className="tooltip-text">{text}</span>
        </span>
      )}
    </span>
  );
}
