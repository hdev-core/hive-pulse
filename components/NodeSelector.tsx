import React, { useState } from 'react';
import { Server, Plus, X, Check, Loader } from 'lucide-react';

interface NodeSelectorProps {
  label: string;
  selectedNode: string;
  presetNodes: string[];
  customNodes: string[];
  autoSwitch: boolean;
  onSelectedNodeChange: (node: string) => void;
  onCustomNodesChange: (nodes: string[]) => void;
  onAutoSwitchChange: (enabled: boolean) => void;
}

export const NodeSelector: React.FC<NodeSelectorProps> = ({
  label,
  selectedNode,
  presetNodes,
  customNodes,
  autoSwitch,
  onSelectedNodeChange,
  onCustomNodesChange,
  onAutoSwitchChange,
}) => {

  const [newNode, setNewNode] = useState('');
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, 'ok' | 'fail'>>({});

  const allNodes = [...presetNodes, ...customNodes];

  const handleAddNode = () => {
    const url = newNode.trim().replace(/\/+$/, '');
    if (!url) return;
    if (!url.startsWith('http')) return;
    if (allNodes.includes(url)) return;
    onCustomNodesChange([...customNodes, url]);
    setNewNode('');
  };

  const handleRemoveCustomNode = (node: string) => {
    onCustomNodesChange(customNodes.filter(n => n !== node));
    if (selectedNode === node) {
      onSelectedNodeChange(presetNodes[0] || '');
    }
  };

  const handleTest = async (node: string) => {
    setTesting(node);
    setTestResult(prev => ({ ...prev, [node]: undefined as any }));
    try {
      const isHe = label.toLowerCase().includes('engine');
      const testUrl = isHe ? node.replace(/\/+$/, '') + '/contracts' : node;
      const body = isHe
        ? { jsonrpc: '2.0', method: 'find', params: { contract: 'tokens', table: 'tokens', query: { symbol: 'BEE' }, limit: 1 }, id: 1 }
        : { jsonrpc: '2.0', method: 'condenser_api.get_dynamic_global_properties', params: [], id: 1 };
      const resp = await fetch(testUrl, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await resp.json();
      setTestResult(prev => ({ ...prev, [node]: data.result ? 'ok' : 'fail' }));
    } catch {
      setTestResult(prev => ({ ...prev, [node]: 'fail' }));
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {allNodes.map(node => {
          const isCustom = customNodes.includes(node);
          const result = testResult[node];
          return (
            <div key={node} className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-all ${selectedNode === node ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <button onClick={() => onSelectedNodeChange(node)} className="flex-1 text-left min-w-0">
                <span className={`block truncate font-mono ${selectedNode === node ? 'text-emerald-800 font-semibold' : 'text-slate-600'}`}>
                  {node.replace('https://', '').replace('/rpc/contracts', '').replace('/rpc', '')}
                </span>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {result === 'ok' && <Check size={14} className="text-emerald-500" />}
                {result === 'fail' && <X size={14} className="text-red-500" />}
                {testing === node && <Loader size={14} className="animate-spin text-slate-400" />}
                <button onClick={() => handleTest(node)} className="text-[10px] text-slate-400 hover:text-slate-600 px-1 py-0.5 rounded hover:bg-slate-100">
                  Test
                </button>
                {isCustom && (
                  <button onClick={() => handleRemoveCustomNode(node)} className="text-red-400 hover:text-red-600">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1.5">
        <input
          type="url"
          value={newNode}
          onChange={e => setNewNode(e.target.value)}
          placeholder="https://custom-node.example.com"
          className="flex-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
          onKeyDown={e => e.key === 'Enter' && handleAddNode()}
        />
        <button
          onClick={handleAddNode}
          disabled={!newNode.trim().startsWith('http')}
          className="flex items-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      <label className="flex items-center justify-between cursor-pointer">
        <div>
          <span className="text-xs text-slate-600">Auto-switch on failure</span>
          <p className="text-[10px] text-slate-400">Try next node if current one is unresponsive</p>
        </div>
        <button
          onClick={() => onAutoSwitchChange(!autoSwitch)}
          className={`w-9 h-5 rounded-full transition-colors relative ${autoSwitch ? 'bg-emerald-500' : 'bg-slate-200'}`}
        >
          <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${autoSwitch ? 'left-[18px]' : 'left-[3px]'}`} />
        </button>
      </label>
    </div>
  );
};