import { readFileSync, writeFileSync } from 'fs';

const lines = readFileSync('src/App.tsx', 'utf8').split('\n');

const fix = `              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {activeSettingsTab === 'account' && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        <img src={userProfile?.avatarUrl || \`https://i.pravatar.cc/150?u=\${userId}\`} className="w-full h-full object-cover" />
                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer">
                          <Paperclip className="text-white w-5 h-5" />
                          <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-bold text-gray-400 uppercase">Display Name</label>
                        <input type="text" defaultValue={userProfile?.username || ''} onBlur={e => handleUpdateProfile({ username: e.target.value })} className="w-full text-lg font-semibold outline-none border-b-2 border-transparent focus:border-[#008751] pb-1 mt-1" />
                      </div>
                    </div>
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Phone</label><p className="text-gray-700 mt-1">{userProfile?.phoneNumber}</p></div>
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Email</label><input type="email" defaultValue={userProfile?.email || ''} onBlur={e => handleUpdateProfile({ email: e.target.value })} placeholder="email@example.com" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mt-1 outline-none focus:ring-2 focus:ring-[#008751]" /></div>
                  </div>
                )}
                {activeSettingsTab === 'privacy' && (
                  <div className="space-y-5">
                    {[
                      { id: 'readReceipts', label: 'Read Receipts', desc: 'Show when you have read messages' },
                      { id: 'lastSeenStatus', label: 'Last Seen', desc: 'Show your last seen time' },
                      { id: 'screenshotProtection', label: 'Privacy Mode', desc: 'Blur content when app loses focus' },
                    ].map(item => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div><p className="font-medium text-gray-700">{item.label}</p><p className="text-sm text-gray-400">{item.desc}</p></div>
                        <div onClick={() => handleUpdateProfile({ [item.id]: userProfile?.[item.id] ? 0 : 1 })} className={\`w-12 h-6 rounded-full cursor-pointer transition-colors relative \${userProfile?.[item.id] ? 'bg-[#008751]' : 'bg-gray-300'}\`}>
                          <div className={\`absolute top-1 w-4 h-4 rounded-full bg-white transition-all \${userProfile?.[item.id] ? 'left-7' : 'left-1'}\`} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeSettingsTab === 'notifications' && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div><p className="font-medium text-gray-700">Push Notifications</p><p className="text-sm text-gray-400">Receive message notifications</p></div>
                      <div onClick={() => handleUpdateProfile({ pushEnabled: userProfile?.pushEnabled ? 0 : 1 })} className={\`w-12 h-6 rounded-full cursor-pointer transition-colors relative \${userProfile?.pushEnabled ? 'bg-[#008751]' : 'bg-gray-300'}\`}>
                        <div className={\`absolute top-1 w-4 h-4 rounded-full bg-white transition-all \${userProfile?.pushEnabled ? 'left-7' : 'left-1'}\`} />
                      </div>
                    </div>
                  </div>
                )}
                {activeSettingsTab === 'backup' && (
                  <div className="space-y-5">
                    <div className="bg-gray-50 rounded-2xl p-5">
                      <p className="font-bold text-gray-700 mb-2">Chat Backup</p>
                      <p className="text-sm text-gray-500 mb-4">Messages stored securely in Firebase. No manual backup needed.</p>
                      <div className="flex items-center gap-2 text-[#008751]"><CheckCheck className="w-4 h-4" /><span className="text-sm font-medium">Auto-synced to Firebase</span></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 py-3 border-t border-gray-100 text-center">
                <p className="text-[9px] text-gray-300">9jaTalk v1.2 - Designed by Thompson Obosa</p>
              </div>
            </motion.div>
          </motion.div>
        )}`;

// Find the broken section boundaries
const startIdx = lines.findIndex(l => l.includes('Tab content'));
const endIdx = lines.findIndex(l => l.includes('</AnimatePresence>'));

const before = lines.slice(0, startIdx);
const after = lines.slice(endIdx);

const result = [...before, ...fix.split('\n'), ...after].join('\n');
writeFileSync('src/App.tsx', result, 'utf8');
console.log('Fixed! Lines:', result.split('\n').length);
