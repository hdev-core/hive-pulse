import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, CheckCircle2 } from 'lucide-react';

interface UserSearchProps {
  onUserSelect: (username: string | null) => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ onUserSelect }) => {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const searchUser = async () => {
      if (!query || query === selectedUser) {
        setMatches([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('https://api.hive.blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'condenser_api.lookup_accounts',
            params: [query.toLowerCase(), 5],
            id: 1
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.result) {
            const validMatches = data.result.filter((name: string) => name.startsWith(query.toLowerCase()));
            setMatches(validMatches);
            setShowDropdown(true);
          } else {
            setMatches([]);
          }
        } else {
          setMatches([]);
        }
      } catch (error) {
        console.error('Error searching user:', error);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchUser, 300);
    return () => clearTimeout(timeoutId);
  }, [query, selectedUser]);

  const handleClear = () => {
    setQuery('');
    setMatches([]);
    setSelectedUser(null);
    onUserSelect(null);
  };

  const handleSelect = (username: string) => {
    setQuery(username);
    setSelectedUser(username);
    onUserSelect(username);
    setShowDropdown(false);
  };

  const getAvatarUrl = (username: string) => `https://images.ecency.com/u/${username}/avatar/small`;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (val === '') {
              setSelectedUser(null);
              onUserSelect(null);
            } else if (selectedUser && val !== selectedUser) {
              setSelectedUser(null);
              onUserSelect(null);
            }
          }}
          placeholder="Search user..."
          className={`w-full pl-9 pr-8 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 transition-all
            ${selectedUser 
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 focus:border-emerald-400 focus:ring-emerald-400' 
              : 'border-slate-200 focus:border-blue-400 focus:ring-blue-400'
            }`}
          onFocus={() => matches.length > 0 && setShowDropdown(true)}
        />
        
        {selectedUser ? (
          <CheckCircle2 className="absolute left-3 top-2.5 text-emerald-500" size={16} />
        ) : (
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
        )}
        
        <div className="absolute right-3 top-2.5 flex items-center gap-2">
          {loading && (
            <Loader2 className="text-blue-500 animate-spin" size={16} />
          )}
          {query && (
            <button 
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {showDropdown && matches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
          {matches.map((username) => (
            <div
              key={username}
              className="px-4 py-2 text-sm cursor-pointer hover:bg-slate-50 flex items-center gap-3"
              onClick={() => handleSelect(username)}
            >
              <img 
                src={getAvatarUrl(username)} 
                alt={username}
                className="w-6 h-6 rounded-full bg-slate-100 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://images.ecency.com/u/hive-123456/avatar/small`; // Default fallback
                }}
              />
              <span className="text-slate-700 font-medium">{username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserSearch;