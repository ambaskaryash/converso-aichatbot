import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Key, Upload, Copy, Check, Code, Eye, Globe, Plus, Trash2, MessageSquare, RefreshCw } from 'lucide-react';
import { api, type Project, type EmbedSettings } from '../lib/api';
import { Button3D } from 'react-3d-button';
import { Input } from '../components/ui/Input';

export const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [ingestText, setIngestText] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [embedFormat, setEmbedFormat] = useState<'html' | 'react' | 'next' | 'vue'>('html');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  
  const queryClient = useQueryClient();
  const WIDGET_DEV_URL = (import.meta.env.VITE_WIDGET_DEV_URL as string | undefined) ?? 'http://localhost:8081';

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      try {
        const projects = await api.getProjects();
        const found = projects.find(p => p.id === id);
        if (found) {
             setProject(found);
             setWelcomeMessage(found.welcome_message || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  const { data: embedSettings } = useQuery({
    queryKey: ['embed-settings', project?.id],
    queryFn: async () => {
      if (!project) return { domains: [], theme: 'ocean' as const };
      return api.getEmbedSettings(project.id, project.api_key);
    },
    enabled: !!project,
  });

  const domains = embedSettings?.domains ?? [];

  const updateSettings = useMutation({
    mutationFn: async (payload: Partial<EmbedSettings>) => {
      if (!project) return embedSettings!;
      return api.updateEmbedSettings(project.id, project.api_key, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embed-settings', project?.id] });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (payload: { welcome_message?: string }) => {
      if (!project) throw new Error("No project");
      return api.updateProject(project.id, payload);
    },
    onSuccess: (updated) => {
      setProject(updated);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const rotateKeyMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No project");
      return api.rotateKey(project.id);
    },
    onSuccess: (updated) => {
      setProject(updated);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const snippet = useMemo(() => {
    const pid = project?.id ?? 'PROJECT_ID';
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
  }, [project, embedFormat]);

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

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const livePreview = () => {
    if (!project) return;
    const base = new URL(WIDGET_DEV_URL);
    const params = new URLSearchParams();
    params.set('projectId', project.id);
    params.set('apiKey', project.api_key);
    const url = `${base.origin}${base.pathname}?${params.toString()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const addDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newDomain.trim().toLowerCase();
    if (!clean) return;
    if (!domains.includes(clean)) {
      updateSettings.mutate({ domains: [...domains, clean] });
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    updateSettings.mutate({ domains: domains.filter(d => d !== domain) });
  };

  if (loading) return <div className="text-gray-300 animate-pulse">Loading...</div>;
  if (!project) return <div className="text-gray-300">Project not found</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft size={16} />
        Back to Projects
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{project.name}</h1>
          <p className="text-gray-400 mt-1 font-mono text-sm">ID: {project.id}</p>
        </div>
        <div className="flex gap-3">
          <Button3D type="success" onPress={livePreview}>
            <span className="flex items-center gap-2">
              <Eye size={16} />
              Live Preview
            </span>
          </Button3D>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Configuration */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* API Key Card */}
          <div className="card-base p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Key size={20} className="text-blue-400" />
              API Key
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-950/50 p-3 rounded-lg border border-gray-800 font-mono text-sm text-gray-300 truncate">
                {project.api_key}
              </div>
              <Button3D type="secondary" onPress={copyApiKey}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </Button3D>
              <Button3D 
                type="danger" 
                onPress={() => {
                   if (confirm('Are you sure you want to rotate the API key? The old key will stop working immediately.')) {
                       rotateKeyMutation.mutate();
                   }
                }}
                disabled={rotateKeyMutation.status === 'pending'}
              >
                <RefreshCw size={18} className={rotateKeyMutation.status === 'pending' ? 'animate-spin' : ''} />
              </Button3D>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Keep this key secret. It allows access to your project's data.
            </p>
          </div>

          {/* Chat Settings */}
          <div className="card-base p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare size={20} className="text-pink-400" />
              Chat Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label-base mb-2">Welcome Message</label>
                <textarea
                  className="w-full bg-gray-950/50 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-y min-h-[80px]"
                  placeholder="Hi! How can I help you today?"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  onBlur={() => {
                     if (welcomeMessage !== project.welcome_message) {
                         updateProjectMutation.mutate({ welcome_message: welcomeMessage });
                     }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This message will be shown when the chat widget opens.
                </p>
              </div>
            </div>
          </div>

          {/* Embed Configuration */}
          <div className="card-base p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Code size={20} className="text-purple-400" />
              Embed Widget
            </h2>
            
            <div className="flex gap-1 border-b border-gray-800 mb-0">
              {(['html', 'react', 'next', 'vue'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setEmbedFormat(fmt)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    embedFormat === fmt
                      ? 'bg-gray-800 text-white border-t border-x border-gray-700'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
                  }`}
                >
                  {fmt === 'html' ? 'HTML' : fmt === 'react' ? 'React' : fmt === 'next' ? 'Next.js' : 'Vue'}
                </button>
              ))}
            </div>
            
            <div className="bg-gray-950/80 p-4 rounded-b-lg border border-gray-800 border-t-0 overflow-x-auto">
              <pre className="text-sm font-mono text-gray-300">{snippet}</pre>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button3D type="primary" onPress={copySnippet}>
                <span className="flex items-center gap-2">
                  {copiedSnippet ? <Check size={16} /> : <Copy size={16} />}
                  {copiedSnippet ? 'Copied' : 'Copy Code'}
                </span>
              </Button3D>
            </div>
          </div>

          {/* Allowed Domains */}
          <div className="card-base p-6">
             <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Globe size={20} className="text-green-400" />
              Allowed Domains
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Restrict which websites can display your chat widget.
            </p>
            
            <form onSubmit={addDomain} className="flex gap-2 mb-4">
              <Input 
                placeholder="e.g. example.com" 
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
              <Button3D type="secondary" onPress={(e) => addDomain(e as unknown as React.FormEvent)} disabled={!newDomain.trim()}>
                <span className="flex items-center gap-2">
                  <Plus size={18} />
                  Add
                </span>
              </Button3D>
            </form>

            <div className="space-y-2">
              {domains.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No domains restricted (widget works everywhere)</p>
              ) : (
                domains.map((domain) => (
                  <div key={domain} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                    <span className="text-sm text-gray-300">{domain}</span>
                    <button 
                      onClick={() => removeDomain(domain)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column - Knowledge Base */}
        <div className="space-y-6">
          <div className="card-base p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Upload size={20} className="text-orange-400" />
              Knowledge Base
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Add context for your AI to answer questions more accurately.
            </p>
            
            <div className="space-y-4">
              <div>
                <textarea
                  value={ingestText}
                  onChange={(e) => setIngestText(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 rounded-lg border border-gray-800 bg-gray-950/50 text-gray-200 outline-none resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  placeholder="Paste text content here..."
                />
              </div>

              {ingestStatus && (
                <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                  ingestStatus.type === 'success' 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {ingestStatus.type === 'success' ? <Check size={16} className="mt-0.5" /> : null}
                  {ingestStatus.message}
                </div>
              )}

              <Button3D 
                type="primary"
                onPress={handleIngest} 
                disabled={ingesting || !ingestText.trim()}
              >
                {ingesting ? 'Processing...' : 'Add Knowledge'}
              </Button3D>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
