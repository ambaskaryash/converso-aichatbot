import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Folder, Calendar, ArrowRight, Code, Copy, Check, Eye } from 'lucide-react';
import { api, type Project } from '../lib/api';
import { Button3D } from 'react-3d-button';

export const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [embedFormat, setEmbedFormat] = useState<'html' | 'react' | 'next' | 'vue'>('html');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [justCreated, setJustCreated] = useState<Project | null>(null);
  const WIDGET_DEV_URL = (import.meta.env.VITE_WIDGET_DEV_URL as string | undefined) ?? 'http://localhost:8081';

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const created = await api.createProject(newProjectName);
      setJustCreated(created);
      setNewProjectName('');
      setIsCreating(false);
      fetchProjects();
    } catch {
      alert('Failed to create project');
    }
  };

  const snippet = useMemo(() => {
    const pid = justCreated?.id ?? 'PROJECT_ID';
    const widgetUrl = 'https://cdn.embedai.dev/widget.js';
    switch (embedFormat) {
      case 'react':
        return `import { useEffect } from 'react';

export const ConversoWidget = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "${widgetUrl}";
    script.dataset.projectId = "${pid}";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return null;
};`;
      case 'next':
        return `import Script from 'next/script';

export const ConversoWidget = () => (
  <Script
    src="${widgetUrl}"
    data-project-id="${pid}"
    strategy="lazyOnload"
  />
);`;
      case 'vue':
        return `<script setup>
import { onMounted } from 'vue';

onMounted(() => {
  const script = document.createElement('script');
  script.src = "${widgetUrl}";
  script.dataset.projectId = "${pid}";
  script.async = true;
  document.body.appendChild(script);
});
</script>`;
      case 'html':
      default:
        return `<script src="${widgetUrl}" data-project-id="${pid}"></script>`;
    }
  }, [justCreated, embedFormat]);

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const livePreview = () => {
    if (!justCreated) return;
    const base = new URL(WIDGET_DEV_URL);
    const params = new URLSearchParams();
    params.set('projectId', justCreated.id);
    params.set('apiKey', justCreated.api_key);
    const url = `${base.origin}${base.pathname}?${params.toString()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading projects...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Projects</h2>
          <p className="text-gray-400 mt-1">Manage your chatbots and knowledge bases</p>
        </div>
        <Button3D type="primary" onPress={() => setIsCreating(true)}>
          <span className="flex items-center gap-2">
            <Plus size={20} />
            New Project
          </span>
        </Button3D>
      </div>

      {isCreating && (
        <div className="mb-8 card-base p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="label-base mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateProject();
                  }
                }}
                placeholder="e.g. Customer Support Bot"
                className="w-full input-base"
                autoFocus
              />
            </div>
            <Button3D type="primary" onPress={handleCreateProject}>
              Create
            </Button3D>
            <Button3D type="secondary" onPress={() => setIsCreating(false)}>
              Cancel
            </Button3D>
          </div>
        </div>
      )}

      {justCreated && (
        <div className="mb-8 bg-gray-900 p-6 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <Code size={18} className="text-purple-400" />
              Embed Code for {justCreated.name}
            </h3>
            <div className="flex gap-2">
              <Button3D type="secondary" onPress={() => setJustCreated(null)}>
                Dismiss
              </Button3D>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">Select your framework and paste the code:</p>
          <div className="mt-3 flex gap-2 border-b border-gray-800 pb-1">
            {(['html', 'react', 'next', 'vue'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setEmbedFormat(fmt)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  embedFormat === fmt
                    ? 'bg-gray-800 text-gray-100 border-t border-x border-gray-700'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                }`}
              >
                {fmt === 'html' ? 'HTML' : fmt === 'react' ? 'React' : fmt === 'next' ? 'Next.js' : 'Vue'}
              </button>
            ))}
          </div>
          <div className="bg-gray-950 text-gray-100 p-4 rounded-b-lg overflow-x-auto text-sm font-mono border border-gray-800 border-t-0">
            <pre>{snippet}</pre>
          </div>
          <div className="mt-4 flex gap-3">
            <Button3D type="info" onPress={copySnippet}>
              <span className="flex items-center gap-2">
                {copiedSnippet ? <Check size={18} /> : <Copy size={18} />}
                {copiedSnippet ? 'Copied!' : 'Copy'}
              </span>
            </Button3D>
            <Button3D type="success" onPress={livePreview}>
              <span className="flex items-center gap-2">
                <Eye size={18} />
                Live Preview
              </span>
            </Button3D>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-12 card-base border-dashed">
          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Folder className="text-gray-500" size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-100">No projects yet</h3>
          <p className="text-gray-400 mt-1 mb-4">Create your first project to get started</p>
          <div className="mt-2">
            <Button3D type="primary" onPress={() => setIsCreating(true)}>
              Create Project
            </Button3D>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className="block group card-base p-6 hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center text-blue-300 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Folder size={20} />
                </div>
                <ArrowRight className="text-gray-600 group-hover:text-blue-500 transition-colors" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">{project.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Calendar size={16} />
                <span>{new Date(project.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
