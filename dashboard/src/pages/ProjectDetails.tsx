import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Key, Upload, Copy, Check, Code } from 'lucide-react';
import { api, type Project } from '../lib/api';
import { Button3D } from 'react-3d-button';

export const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [ingestText, setIngestText] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      try {
        const projects = await api.getProjects();
        const found = projects.find(p => p.id === id);
        if (found) setProject(found);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  const handleIngest = async () => {
    if (!project || !ingestText.trim()) return;

    setIngesting(true);
    setIngestStatus(null);
    try {
      await api.ingestText(project.id, project.api_key, ingestText);
      setIngestStatus({ type: 'success', message: 'Knowledge successfully added!' });
      setIngestText('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to ingest text';
      setIngestStatus({ type: 'error', message });
    } finally {
      setIngesting(false);
    }
  };

  const copyApiKey = () => {
    if (project?.api_key) {
      navigator.clipboard.writeText(project.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <div className="text-gray-300">Loading...</div>;
  if (!project) return <div className="text-gray-300">Project not found</div>;

  return (
    <div>
      <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-6">
        <ArrowLeft size={20} />
        Back to Projects
      </Link>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">{project.name}</h1>
          <p className="text-gray-400 mt-1">Project ID: {project.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="card-base p-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
              <Key size={20} className="text-blue-400" />
              Converso API Key
            </h2>
            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 flex items-center justify-between gap-4">
              <code className="text-sm font-mono text-gray-200 truncate">
                {project.api_key}
              </code>
              <Button3D type="secondary" onPress={copyApiKey}>
                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
              </Button3D>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Keep this key secret. It allows access to Converso ingestion and chat.
            </p>
          </div>

          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
              <Code size={20} className="text-purple-400" />
              Converso Embed
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Add this code to your website's body tag:
            </p>
            <div className="bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-gray-800">
              <pre>
{`<script 
  src="http://localhost:5173/widget.js" 
  data-project-id="${project.id}"
></script>`}
              </pre>
            </div>
          </div>
        </div>

        <div className="card-base p-6 h-fit">
          <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <Upload size={20} className="text-green-400" />
            Add Knowledge
          </h2>
          <form>
            <div className="mb-4">
              <label className="label-base mb-1">Text Content</label>
              <textarea
                value={ingestText}
                onChange={(e) => setIngestText(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 rounded-lg border border-gray-800 bg-gray-950 text-gray-200 outline-none resize-none focus:border-blue-500"
                placeholder="Paste text content here for your bot to learn..."
              />
            </div>

            {ingestStatus && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                ingestStatus.type === 'success' ? 'bg-green-950 text-green-300 border border-green-900' : 'bg-red-950 text-red-300 border border-red-900'
              }`}>
                {ingestStatus.message}
              </div>
            )}

            <div className="flex justify-end">
              <Button3D
                type="success"
                onPress={handleIngest}
                disabled={ingesting || !ingestText.trim()}
              >
                {ingesting ? 'Ingesting...' : 'Add to Knowledge Base'}
              </Button3D>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
