import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Code, Globe, Eye, Palette, Copy, Check } from 'lucide-react';
import { api } from '../lib/api';
import { Button3D } from 'react-3d-button';
import { Input } from '../components/ui/Input';

// Design: Embed page centers on the snippet, domain whitelist, theme selection, and quick preview actions.
// Clear guidance and a copy button reduce friction for developers and founders.

export const Embed: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
  });
  const project = useMemo(() => projects.find(p => p.id === id) ?? null, [projects, id]);

  const [copied, setCopied] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const queryClient = useQueryClient();
  const WIDGET_DEV_URL = (import.meta.env.VITE_WIDGET_DEV_URL as string | undefined) ?? 'http://localhost:8081';

  const { data: embedSettings } = useQuery({
    queryKey: ['embed-settings', project?.id],
    queryFn: async () => {
      if (!project) return { domains: [], theme: 'ocean' as const };
      return api.getEmbedSettings(project.id, project.api_key);
    },
    enabled: !!project,
  });

  const domains = embedSettings?.domains ?? [];
  const theme = embedSettings?.theme ?? 'ocean';

  const updateSettings = useMutation({
    mutationFn: async (payload: Partial<{ domains: string[]; theme: typeof theme }>) => {
      if (!project) return embedSettings!;
      return api.updateEmbedSettings(project.id, project.api_key, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embed-settings', project?.id] });
    },
  });

  const [embedFormat, setEmbedFormat] = useState<'html' | 'react' | 'next' | 'vue'>('html');

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

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addDomain = () => {
    const clean = newDomain.trim().toLowerCase();
    if (!clean) return;
    if (!domains.includes(clean)) {
      updateSettings.mutate({ domains: [...domains, clean] });
      setNewDomain('');
    }
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

  if (!project) {
    return (
      <div className="text-gray-300">Project not found</div>
    );
  }

  return (
    <div className="space-y-8">
      <Link to={`/project/${project.id}`} className="flex items-center gap-2 text-gray-400 hover:text-gray-200">
        <ArrowLeft size={18} />
        Back to Project
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Embed & Integrations</h2>
          <p className="text-gray-400">Add Converso to your website in seconds</p>
        </div>
        <Button3D type="primary" onPress={copySnippet}>
          <span className="flex items-center gap-2">
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied!' : 'Copy Snippet'}
          </span>
        </Button3D>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-base p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Code size={18} />
            Embed Code
          </h3>
          <p className="text-sm text-gray-400 mt-2">Select your framework and paste the code:</p>
          
          <div className="mt-4 flex gap-2 border-b border-gray-800 pb-1">
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

          <div className="bg-gray-950 border border-gray-800 border-t-0 rounded-b-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-200 font-mono">{snippet}</pre>
          </div>
          <div className="mt-4 flex gap-3">
            <Button3D type="info" onPress={copySnippet}>
              <span className="flex items-center gap-2">
                <Copy size={16} />
                Copy
              </span>
            </Button3D>
            <Button3D type="success" onPress={livePreview}>
              <span className="flex items-center gap-2">
                <Eye size={16} />
                Live Preview
              </span>
            </Button3D>
          </div>
        </div>

        <div className="card-base p-6">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Globe size={18} />
            Allowed Domains
          </h3>
          <p className="text-sm text-gray-400 mt-2">Only these domains can load your bot</p>
          <div className="mt-3">
            <div className="flex gap-3">
              <Input
                className="flex-1"
                placeholder="e.g. yoursite.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addDomain()}
              />
              <Button3D type="secondary" onPress={addDomain} disabled={!newDomain.trim()}>
                Add
              </Button3D>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {domains.map((d) => (
                <span key={d} className="px-3 py-1 rounded-full bg-gray-800 text-gray-200 text-sm border border-gray-700">
                  {d}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <Palette size={16} />
              Theme
            </h4>
            <p className="text-sm text-gray-400 mt-1">Controls the widget theme</p>
            <select
              className="mt-2 w-full px-3 py-2 rounded-md bg-gray-950 border border-gray-800 text-gray-200 outline-none"
              value={theme}
              onChange={(e) => updateSettings.mutate({ theme: e.target.value as typeof theme })}
            >
              <option value="ocean">Ocean</option>
              <option value="sunset">Sunset</option>
              <option value="forest">Forest</option>
              <option value="neon">Neon</option>
              <option value="pirate">Pirate</option>
            </select>
            <div className="mt-3">
              <Button3D type="primary" onPress={() => queryClient.invalidateQueries({ queryKey: ['embed-settings', project?.id] })}>
                Apply Theme
              </Button3D>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
