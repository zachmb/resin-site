import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Command, 
  FileText, 
  Folder, 
  Share2, 
  Graph, 
  MoreVertical, 
  Edit3, 
  Eye, 
  History,
  Archive,
  Database,
  Trash2,
  Settings,
  Plus
} from 'lucide-react';

/**
 * RESIN ARCHIVED NOTES REDESIGN
 * Lead UI/UX Engineer Concept
 * Architecture: Mobile-first, Obsidian-inspired Triple Pane
 */

const ResinArchivedNotes = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [activeNote, setActiveNote] = useState({
    title: "Project Phoenix: Retrieval Strategy",
    content: "# Project Phoenix\n\n## Context\nThis archive contains the brain dump from Feb 20, 2026 regarding the *Phoenix* retrieval protocol.\n\n### Tasks\n- [x] Scan local cache\n- [ ] Reconfigure amber nodes\n- [ ] Sync with core orchestrator\n\n> Note: The latency spike in the northern quadrant remains unexplained.",
    date: "2026-02-20"
  });

  // Shortcut handler for Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-[#F8F5EE] text-[#222222] font-sans selection:bg-[#E89A3C]/20 overflow-hidden">
      
      {/* 1. THE RIBBON (Action Bar) */}
      <aside className="w-14 border-r border-[#2B4634]/5 bg-white flex flex-col items-center py-6 gap-6 z-50">
        <div className="w-10 h-10 bg-[#2B4634] rounded-[12px] flex items-center justify-center shadow-premium">
          <img src="/logo.png" alt="Resin" className="w-7 h-7" />
        </div>
        
        <div className="flex flex-col gap-4 mt-8">
          <RibbonItem icon={<Search size={22} />} active />
          <RibbonItem icon={<Graph size={22} />} />
          <RibbonItem icon={<History size={22} />} />
          <RibbonItem icon={<Archive size={22} />} />
        </div>

        <div className="mt-auto flex flex-col gap-4">
          <RibbonItem icon={<Settings size={22} />} />
          <div className="w-8 h-8 rounded-full bg-[#E89A3C]/20 border border-[#E89A3C]/10 flex items-center justify-center overflow-hidden">
            <span className="text-[10px] font-bold text-[#2B4634]">ZB</span>
          </div>
        </div>
      </aside>

      {/* 2. THE FILE EXPLORER (Collapsible Sidebar) */}
      <motion.nav 
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 0 }}
        className="bg-white/40 backdrop-blur-xl border-r border-[#2B4634]/5 overflow-hidden flex flex-col"
      >
        <div className="p-6 w-[280px]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold font-serif tracking-tight text-[#2B4634]">Archives</h2>
            <button className="p-1.5 hover:bg-[#2B4634]/5 rounded-md text-[#5C4B3C]">
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-6">
            <FolderSection title="RECENT DUMPS">
              <FileItem title="Feb 23: Morning Flow" active />
              <FileItem title="Feb 22: Deep Logic" />
              <FileItem title="Feb 20: Project Phoenix" />
            </FolderSection>

            <FolderSection title="COLLECTIONS">
              <FolderItem title="Research" />
              <FolderItem title="Project Resin" />
              <FolderItem title="Personal" />
            </FolderSection>
          </div>
        </div>
      </motion.nav>

      {/* 3. THE EDITOR (Central Area) */}
      <main className="flex-1 flex flex-col relative">
        {/* Editor Header */}
        <header className="h-14 border-b border-[#2B4634]/5 bg-white/60 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-[#2B4634]/5 rounded-md"
            >
              {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
            <div className="flex items-center gap-2 text-sm text-[#5C4B3C]/60">
              <span>Archives</span>
              <ChevronRight size={14} />
              <span className="text-[#2B4634] font-medium">{activeNote.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#2B4634]/5 p-1 rounded-lg mr-4">
              <ViewToggle icon={<Eye size={16} />} active={!isEditing} onClick={() => setIsEditing(false)} />
              <ViewToggle icon={<Edit3 size={16} />} active={isEditing} onClick={() => setIsEditing(true)} />
            </div>
            <button className="p-1.5 hover:bg-[#2B4634]/5 rounded-md text-[#5C4B3C]"><Share2 size={18} /></button>
            <button 
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className="p-1.5 hover:bg-[#2B4634]/5 rounded-md text-[#5C4B3C]"
            >
              <MoreVertical size={18} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-12 py-10 max-w-4xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.textarea
                key="editor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full bg-transparent resize-none font-mono text-[15px] leading-relaxed text-[#2B4634] focus:outline-none"
                value={activeNote.content}
                onChange={(e) => setActiveNote({...activeNote, content: e.target.value})}
              />
            ) : (
              <motion.div
                key="reader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="prose prose-resin max-w-none"
              >
                <h1 className="text-4xl font-serif font-bold text-[#2B4634] mb-8">{activeNote.title}</h1>
                <div className="text-[17px] leading-8 text-[#5C4B3C]/90 font-light space-y-6">
                  {/* Markdown rendering mockup */}
                  <p>Captured on <span className="text-[#E89A3C] font-semibold">{activeNote.date}</span></p>
                  <p>This archive contains the brain dump from Feb 20, 2026 regarding the <em className="italic">Phoenix</em> retrieval protocol.</p>
                  <div className="bg-[#2B4634]/5 border-l-4 border-[#E89A3C] p-6 rounded-r-xl italic italic font-serif">
                    Note: The latency spike in the northern quadrant remains unexplained.
                  </div>
                  <h3 className="text-2xl font-bold text-[#2B4634] pt-4">Tasks</h3>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-md bg-[#2B4634] flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                      </div>
                      <span className="line-through text-[#5C4B3C]/40">Scan local cache</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-md border-2 border-[#2B4634]/20"></div>
                      <span>Reconfigure amber nodes</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. THE COMMAND PALETTE (Modal) */}
        <AnimatePresence>
          {showCommandPalette && (
            <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 px-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCommandPalette(false)}
                className="absolute inset-0 bg-[#2B4634]/20 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-2xl bg-white border border-[#2B4634]/10 shadow-2xl rounded-2xl overflow-hidden"
              >
                <div className="flex items-center px-6 h-16 border-b border-[#2B4634]/5">
                  <Search size={20} className="text-[#5C4B3C]/40 mr-4" />
                  <input 
                    autoFocus
                    placeholder="Search archives or type a command..."
                    className="flex-1 bg-transparent border-none focus:outline-none text-lg text-[#2B4634]"
                  />
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-[#2B4634]/5 rounded text-[10px] font-bold text-[#5C4B3C]">
                    <Command size={10} /> <span>K</span>
                  </div>
                </div>
                <div className="py-2 max-h-[400px] overflow-y-auto">
                  <CommandItem icon={<Plus size={18} />} title="New Brain Dump" shortcut="⌘ N" />
                  <CommandItem icon={<FileText size={18} />} title="Restore selected dump" shortcut="⌘ R" />
                  <CommandItem icon={<Share2 size={18} />} title="Export to PDF" />
                  <div className="h-[1px] bg-[#2B4634]/5 my-2 mx-4" />
                  <CommandItem icon={<Database size={18} />} title="Sync with Supabase" />
                  <CommandItem icon={<Trash2 size={18} />} title="Delete permanently" danger />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* 5. THE GRAPH / INFO PANEL (Secondary Panel) */}
      <motion.aside 
        initial={false}
        animate={{ width: rightPanelOpen ? 320 : 0 }}
        className="bg-white border-l border-[#2B4634]/5 overflow-hidden flex flex-col"
      >
        <div className="w-[320px] p-6 space-y-8">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#5C4B3C]/50 mb-4">NOTE GRAPH</h3>
            <div className="aspect-square bg-[#F8F5EE] rounded-2xl border border-[#2B4634]/5 flex items-center justify-center overflow-hidden group">
              {/* Mock Graph Visualization */}
              <div className="relative w-full h-full flex items-center justify-center p-8">
                <div className="w-4 h-4 rounded-full bg-[#E89A3C] shadow-lg relative z-10" />
                <div className="absolute w-32 h-[1px] bg-[#2B4634]/10 rotate-45" />
                <div className="absolute w-24 h-[1px] bg-[#2B4634]/10 -rotate-12 translate-x-12 translate-y-8" />
                <div className="absolute top-1/4 left-1/3 w-2 h-2 rounded-full bg-[#2B4634]/20" />
                <div className="absolute bottom-1/4 right-1/4 w-3 h-3 rounded-full bg-[#2B4634]/40" />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#5C4B3C]/50 mb-4">METADATA</h3>
            <div className="space-y-4">
              <MetaRow label="Created" value="Feb 20, 2026" />
              <MetaRow label="Word Count" value="152 words" />
              <MetaRow label="Related" value="#Strategy #ProjectPhoenix" />
            </div>
          </section>
        </div>
      </motion.aside>
    </div>
  );
};

// --- Sub-components ---

const RibbonItem = ({ icon, active = false }: { icon: React.ReactNode, active?: boolean }) => (
  <button className={`p-2.5 rounded-[10px] transition-all duration-300 ${active ? 'bg-[#2B4634] text-white shadow-md' : 'text-[#5C4B3C]/40 hover:text-[#2B4634] hover:bg-[#2B4634]/5'}`}>
    {icon}
  </button>
);

const FolderSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="space-y-1">
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#5C4B3C]/40 pl-3 mb-2">{title}</h3>
    {children}
  </div>
);

const FileItem = ({ title, active = false }: { title: string, active?: boolean }) => (
  <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-[#E89A3C]/10 text-[#2B4634] font-semibold' : 'text-[#5C4B3C]/70 hover:bg-[#2B4634]/5 hover:text-[#2B4634]'}`}>
    <FileText size={16} className={active ? 'text-[#E89A3C]' : 'opacity-40'} />
    <span className="truncate">{title}</span>
  </button>
);

const FolderItem = ({ title }: { title: string }) => (
  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#5C4B3C]/70 hover:bg-[#2B4634]/5 hover:text-[#2B4634] transition-colors">
    <Folder size={16} className="opacity-40" />
    <span className="truncate">{title}</span>
  </button>
);

const ViewToggle = ({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`p-1.5 rounded transition-all ${active ? 'bg-white shadow-sm text-[#2B4634]' : 'text-[#5C4B3C]/40 hover:text-[#2B4634]'}`}
  >
    {icon}
  </button>
);

const CommandItem = ({ icon, title, shortcut, danger = false }: { icon: React.ReactNode, title: string, shortcut?: string, danger?: boolean }) => (
  <button className={`w-full flex items-center justify-between px-6 py-3.5 hover:bg-[#2B4634]/5 transition-colors group`}>
    <div className={`flex items-center gap-4 ${danger ? 'text-red-600' : 'text-[#2B4634]'}`}>
      <span className="opacity-60 group-hover:opacity-100 transition-opacity">{icon}</span>
      <span className="font-medium">{title}</span>
    </div>
    {shortcut && <span className="text-[11px] font-bold text-[#5C4B3C]/30">{shortcut}</span>}
  </button>
);

const MetaRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-[#5C4B3C]/40">{label}</span>
    <span className="text-[#2B4634] font-medium">{value}</span>
  </div>
);

export default ResinArchivedNotes;
