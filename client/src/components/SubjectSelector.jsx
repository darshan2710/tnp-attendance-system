import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SubjectSelector = ({ subjects, selectedSubject, onSelect }) => {
  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkOverflow = () => {
    if (!scrollRef.current) return;
    const { scrollWidth, clientWidth, scrollLeft } = scrollRef.current;
    
    setShowLeftArrow(scrollLeft > 0);
    // Use a small threshold to account for sub-pixel rendering.
    setShowRightArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1);
  };

  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [subjects]);

  const handleScroll = () => {
    checkOverflow();
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      // Scroll by mostly full width but leave a little so user knows it continued
      const scrollAmount = Math.max(clientWidth * 0.6, 150); 
      scrollRef.current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
    }
  };

  // When selected subject changes, we might want to ensure it's scrolled into view.
  useEffect(() => {
    if (scrollRef.current && selectedSubject) {
      const activeElement = scrollRef.current.querySelector('.subject-chip.active');
      if (activeElement) {
        // Simple heuristic to scroll to the selected chip if it's out of bounds
        const navRect = scrollRef.current.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();
        
        if (activeRect.left < navRect.left) {
          scrollRef.current.scrollBy({ left: activeRect.left - navRect.left - 20, behavior: 'smooth' });
        } else if (activeRect.right > navRect.right) {
          scrollRef.current.scrollBy({ left: activeRect.right - navRect.right + 20, behavior: 'smooth' });
        }
      }
    }
  }, [selectedSubject]);

  if (!subjects || subjects.length === 0) {
    return <div className="chip" style={{ display: 'inline-block', fontSize: '13px', padding: '6px 16px' }}>No Subject Assigned</div>;
  }

  if (subjects.length === 1) {
    return (
      <div className="chip" style={{ display: 'inline-block', fontSize: '13px', padding: '6px 16px' }}>
        {subjects[0]}
      </div>
    );
  }

  return (
    <div className="subject-selector-container">
      {showLeftArrow && (
        <div className="arrow-wrapper left">
          <button className="subject-arrow-btn" onClick={() => scroll('left')}>
            <ChevronLeft size={16} />
          </button>
        </div>
      )}
      
      <div 
        className="subject-scroll-view" 
        ref={scrollRef} 
        onScroll={handleScroll}
      >
        {subjects.map((sub, i) => (
          <button
            key={i}
            className={`subject-chip ${selectedSubject === sub ? 'active' : ''}`}
            onClick={() => onSelect(sub)}
          >
            {sub}
          </button>
        ))}
      </div>

      {showRightArrow && (
        <div className="arrow-wrapper right">
          <button className="subject-arrow-btn" onClick={() => scroll('right')}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SubjectSelector;
