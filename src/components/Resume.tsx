import { useState, useCallback, useRef } from 'react';
import { Download, Eye, FileText, Award, Code, Briefcase, AlertCircle, Check, ExternalLink } from 'lucide-react';

// Configuration
const RESUME_CONFIG = {
  fileName: 'Emmanuel_Moghalu_Resume.pdf',
  filePath: '/resume/emmanuel-moghalu-resume.pdf',
  fileSize: '2.4 MB',
  pageCount: 2,
  lastUpdated: 'January 2025',
  previewUrl: 'https://drive.google.com/file/d/your-file-id/preview', // Example
  downloadUrl: 'https://drive.google.com/uc?export=download&id=your-file-id' // Example
};

// Types
interface ResumeStats {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  description: string;
}

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

// Custom Toast Component
const Toast = ({ toast, onClose }: { toast: ToastState; onClose: () => void }) => {
  if (!toast.show) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <Check className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getBgColor = () => {
    switch (toast.type) {
      case 'success': return 'bg-green-50 text-green-800 border-green-200';
      case 'error': return 'bg-red-50 text-red-800 border-red-200';
      default: return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className={`px-4 py-3 rounded-lg shadow-lg border flex items-center space-x-2 min-w-[300px] ${getBgColor()}`}>
        {getIcon()}
        <span className="flex-1">{toast.message}</span>
        <button
          onClick={onClose}
          className="text-sm font-medium hover:underline"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

const Resume = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  }, []);

  const resumeStats: ResumeStats[] = [
    {
      icon: Briefcase,
      label: 'Experience',
      value: '5+',
      description: 'Years of professional development experience'
    },
    {
      icon: Code,
      label: 'Projects',
      value: '50+',
      description: 'Completed projects across various technologies'
    },
    {
      icon: Award,
      label: 'Certifications',
      value: '8',
      description: 'Professional certifications and achievements'
    },
    {
      icon: FileText,
      label: 'Skills',
      value: '20+',
      description: 'Technical skills and programming languages'
    }
  ];

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);

    try {
      // For demo purposes, we'll simulate a download
      // In production, this would be a real file download
      showToast('Preparing download...', 'info');

      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate loading

      // Create a blob with dummy PDF content for demo
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Emmanuel Moghalu - Resume) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`;

      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = RESUME_CONFIG.fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);

      showToast('Resume downloaded successfully!', 'success');
    } catch (error) {
      console.error('Download failed:', error);
      showToast('Download failed. Please try again.', 'error');
    } finally {
      setIsDownloading(false);
    }
  }, [showToast]);

  const handlePreview = useCallback(async () => {
    setIsPreviewing(true);

    try {
      showToast('Opening preview...', 'info');

      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In production, this would open the actual PDF
      // For demo, we'll open a placeholder
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Resume Preview - Emmanuel Moghalu</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 40px; 
                  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                  background: #f5f5f5;
                }
                .container {
                  max-width: 800px;
                  margin: 0 auto;
                  background: white;
                  padding: 60px;
                  border-radius: 8px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                h1 { color: #2563eb; margin-bottom: 10px; }
                .subtitle { color: #666; margin-bottom: 30px; }
                .section { margin-bottom: 30px; }
                .section h2 { color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
                .skills { display: flex; flex-wrap: wrap; gap: 10px; }
                .skill { background: #f3f4f6; padding: 5px 12px; border-radius: 4px; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Emmanuel Moghalu</h1>
                <p class="subtitle">Full Stack Developer | Software Engineer</p>
                
                <div class="section">
                  <h2>Experience</h2>
                  <p><strong>Senior Full Stack Developer</strong> - Tech Company (2020 - Present)</p>
                  <ul>
                    <li>Led development of scalable web applications using React, Node.js, and cloud services</li>
                    <li>Improved application performance by 40% through optimization techniques</li>
                    <li>Mentored junior developers and established coding best practices</li>
                  </ul>
                </div>
                
                <div class="section">
                  <h2>Technical Skills</h2>
                  <div class="skills">
                    <span class="skill">JavaScript/TypeScript</span>
                    <span class="skill">React</span>
                    <span class="skill">Node.js</span>
                    <span class="skill">Python</span>
                    <span class="skill">AWS</span>
                    <span class="skill">Docker</span>
                    <span class="skill">PostgreSQL</span>
                    <span class="skill">MongoDB</span>
                  </div>
                </div>
                
                <div class="section">
                  <h2>Education</h2>
                  <p><strong>Bachelor of Science in Computer Science</strong></p>
                  <p>University Name - Graduated with Honors</p>
                </div>
                
                <p style="text-align: center; margin-top: 40px; color: #666;">
                  This is a preview. Download the full PDF for complete details.
                </p>
              </div>
            </body>
          </html>
        `);
        previewWindow.document.close();
        showToast('Preview opened in new tab', 'success');
      } else {
        throw new Error('Popup blocked');
      }
    } catch (error) {
      console.error('Preview failed:', error);
      showToast('Preview failed. Please check popup settings.', 'error');
    } finally {
      setIsPreviewing(false);
    }
  }, [showToast]);

  return (
    <>
      <section
        id="resume"
        className="py-20 lg:py-32 bg-gradient-to-b from-gray-50 to-white"
        aria-labelledby="resume-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              id="resume-heading"
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-gray-900"
            >
              My <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Resume</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Download my complete resume or preview it online to learn more about my experience and qualifications.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Resume Stats */}
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                {resumeStats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 text-center group hover:scale-105"
                  >
                    <div className="inline-flex p-3 rounded-xl bg-blue-50 mb-4 group-hover:bg-blue-100 transition-colors duration-300">
                      <stat.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold mb-1 text-gray-900">{stat.value}</div>
                    <div className="text-sm font-medium text-gray-600 mb-2">{stat.label}</div>
                    <div className="text-xs text-gray-500">{stat.description}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <h3 className="text-xl font-bold mb-4 text-gray-900">Resume Highlights</h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Comprehensive overview of technical skills and expertise</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Detailed work experience with quantified achievements</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Education background and professional certifications</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Notable projects and open-source contributions</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Resume Preview and Actions */}
            <div className="space-y-8">
              {/* Resume Preview */}
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <button
                  onClick={handlePreview}
                  disabled={isPreviewing}
                  className="w-full aspect-[8.5/11] bg-gradient-to-b from-white to-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center mb-6 cursor-pointer transition-all duration-300 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed group"
                  aria-label="Preview resume PDF"
                >
                  <div className="text-center">
                    {isPreviewing ? (
                      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                    ) : (
                      <FileText className="h-16 w-16 text-gray-400 group-hover:text-blue-500 mx-auto mb-4 transition-colors duration-300" />
                    )}
                    <p className="text-gray-600 group-hover:text-blue-600 transition-colors duration-300">
                      {isPreviewing ? 'Opening Preview...' : 'Resume Preview'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Click to view full document
                    </p>
                  </div>
                </button>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg transform transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                  >
                    {isDownloading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>Download PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handlePreview}
                    disabled={isPreviewing}
                    className="flex-1 px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg transform transition-all duration-300 hover:scale-105 hover:bg-blue-50 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                  >
                    {isPreviewing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span>Opening...</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        <span>Preview Online</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Document Details */}
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <h3 className="text-lg font-bold mb-4 text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Document Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Format:</span>
                    <span className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded text-sm">PDF</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Size:</span>
                    <span className="font-medium text-gray-900">{RESUME_CONFIG.fileSize}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="font-medium text-gray-900">{RESUME_CONFIG.lastUpdated}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Pages:</span>
                    <span className="font-medium text-gray-900">{RESUME_CONFIG.pageCount}</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-start space-x-2">
                    <ExternalLink className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Professional Tip</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Best viewed on desktop for optimal formatting. Mobile preview available.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Toast toast={toast} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
    </>
  );
};

export default Resume;