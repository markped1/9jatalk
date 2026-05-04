const fs = require('fs');
const clean = fs.readFileSync('src/App_clean.tsx', 'utf8').trimEnd();
const ui = clean + `

  return (
    <div className={'flex h-screen bg-[#f0f2f5] overflow-hidden ' + (isPrivacyProtected ? 'blur-sm' : '')}>
      <div className={(isSidebarOpen ? 'flex' : 'hidden md:flex') + ' w-full md:w-[340px] flex-col bg-white border-r border-gray-200 z-10 flex-shrink-0'}>
        <div className='bg-[#f0f2f5] px-4 py-3 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <img src={userProfile?.avatarUrl || ('https://i.pravatar.cc/100?u=' + userId)} className='w-10 h-10 rounded-full object-cover'/>
            <span className='text-sm font-bold text-gray-700'>{userProfile?.username || userProfile?.phoneNumber}</span>
          </div>
          <div className='flex items-center gap-4 text-gray-500'>
            <Users className='w-5 h-5 cursor-pointer' onClick={()=>setShowGroupModal(true)}/>
            <MessageSquare className='w-5 h-5 cursor-pointer' onClick={()=>setShowNewChat(true)}/>
            <Settings className='w-5 h-5 cursor-pointer' onClick={()=>setShowSettings(true)}/>
          </div>
        </div>
        <div className='p-3'>
          <div className='bg-[#f0f2f5] rounded-xl flex items-center px-3 py-2'>
            <Search className='w-4 h-4 text-gray-400'/>
            <input type='text' placeholder='Search or start new chat' className='bg-transparent border-none outline-none w-full ml-3 text-sm' value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
          </div>
        </div>
        <div className='flex-1 overflow-y-auto'>
          {chats.filter(c=>c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(chat=>(
            <div key={chat.id} onClick={()=>selectChat(chat)} className={'flex items-center px-4 py-3 cursor-pointer ' + (activeChat?.id===chat.id ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]')}>
              <div className='relative w-12 h-12 flex-shrink-0'>
                <img src={chat.avatar} className='rounded-full w-full h-full object-cover'/>
                {chat.online && <div className='absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full'/>}
              </div>
              <div className='ml-3 flex-1 min-w-0'>
                <div className='flex justify-between items-baseline'>
                  <h3 className='font-medium text-gray-900 truncate'>{chat.name}</h3>
                  <span className={'text-xs ml-2 ' + (chat.unread > 0 ? 'text-[#008751] font-bold' : 'text-gray-400')}>{chat.time}</span>
                </div>
                <p className={'text-sm truncate ' + (chat.unread > 0 ? 'font-medium text-gray-900' : 'text-gray-500')}>{chat.typing ? <span className='text-[#008751] animate-pulse'>typing...</span> : chat.lastMessage}</p>
              </div>
              {chat.unread > 0 && <span className='bg-[#008751] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold ml-2'>{chat.unread}</span>}
            </div>
          ))}
        </div>
        <div className='p-3 text-center border-t border-gray-100'><p className='text-[9px] text-gray-300'>Designed by Thompson Obosa</p></div>
      </div>
      <div className={(activeChat ? 'flex' : 'hidden md:flex') + ' flex-1 flex-col bg-[#efeae2] relative overflow-hidden'}>
        {activeChat ? (
          <>
            <div className='bg-[#f0f2f5] px-4 py-2 flex items-center justify-between border-l border-gray-200 shadow-sm z-10'>
              <div className='flex items-center'>
                <button onClick={()=>setIsSidebarOpen(true)} className='md:hidden mr-3 text-gray-500'><ArrowLeft className='w-6 h-6'/></button>
                <img src={activeChat.avatar} className='w-10 h-10 rounded-full object-cover mr-3'/>
                <div>
                  <h3 className='font-medium text-gray-900'>{activeChat.name}</h3>
                  <p className='text-[11px] text-gray-500'>{activeChat.typing ? 'typing...' : activeChat.isGroup ? (chatMembers.length + ' members') : 'online'}</p>
                </div>
              </div>
              <div className='flex items-center gap-4 text-gray-500'>
                <Video onClick={()=>initiateCall('video')} className='w-5 h-5 cursor-pointer'/>
                <Phone onClick={()=>initiateCall('voice')} className='w-5 h-5 cursor-pointer'/>
                <Sparkles className='w-5 h-5 text-[#008751]'/>
              </div>
            </div>
            <div className='flex-1 overflow-y-auto p-4 space-y-2 pb-24'>
              <div className='flex justify-center mb-4'><div className='bg-[#fff9c4] text-[11px] text-gray-600 px-4 py-1 rounded shadow-sm flex items-center gap-2'><CheckCheck className='w-3 h-3'/>End-to-end encrypted</div></div>
              <AnimatePresence initial={false}>
                {messages.filter(m => activeChat.isGroup ? (m.receiverId===activeChat.id || m.senderId===userId) : (m.senderId===userId && m.receiverId===activeChat.id) || (m.senderId===activeChat.id && m.receiverId===userId)).map(msg=>(
                  <motion.div key={msg.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className={'flex ' + (msg.senderId===userId ? 'justify-end' : 'justify-start')}>
                    <div className={'max-w-[75%] rounded-xl shadow-sm relative group ' + (msg.senderId===userId ? 'bg-[#dcf8c6]' : 'bg-white')}>
                      <div className='hidden group-hover:flex absolute -top-6 left-0 gap-1 bg-white rounded-full px-1 py-0.5 shadow-md border border-gray-100 z-10'>
                        {['👍','❤️','😂','😮','😢'].map(e=><button key={e} onClick={()=>handleReact(msg.id,e)} className='hover:scale-125 transition-transform text-xs px-0.5'>{e}</button>)}
                      </div>
                      <div className='px-3 py-2'>
                        {msg.type==='image' ? <img src={msg.content} className='rounded-lg max-w-full max-h-64 object-cover mb-1'/> : msg.type==='audio' ? <div className='flex items-center gap-3 py-1 min-w-[180px]'><div className='w-9 h-9 rounded-full bg-[#008751] flex items-center justify-center text-white'><Mic className='w-4 h-4'/></div><audio src={msg.content} controls className='h-8 w-full max-w-[140px]'/></div> : <p className='text-[15px] leading-relaxed pr-6'>{msg.content}</p>}
                        {translatedMessages[msg.id] && <p className='text-[12px] italic text-[#005a32] mt-1 pt-1 border-t border-black/10'><span className='text-[9px] uppercase font-black mr-1 opacity-60'>Translated:</span>{translatedMessages[msg.id]}</p>}
                        {translatingId===msg.id && <p className='text-[10px] animate-pulse text-gray-400 mt-1'>Translating...</p>}
                        <div className='flex items-center justify-end gap-1 mt-1'>
                          <span className='text-[10px] text-gray-400'>{formatTime(msg.timestamp)}</span>
                          {msg.senderId===userId && (msg.status==='read' ? <CheckCheck className='w-3 h-3 text-blue-400'/> : <Check className='w-3 h-3 text-gray-400'/>)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef}/>
            </div>
            {aiSuggestions.length > 0 && (
              <div className='absolute bottom-20 left-0 right-0 flex gap-2 overflow-x-auto px-4 pb-2 z-10'>
                {aiSuggestions.map((s,i)=><button key={i} onClick={()=>{setInputText(s);setAiSuggestions([]);}} className='bg-white/90 border border-black/5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap hover:bg-[#008751] hover:text-white transition-all shadow-sm flex-shrink-0'>{s}</button>)}
              </div>
            )}
            <div className='bg-[#f0f2f5] p-3 flex items-center absolute bottom-0 left-0 right-0 z-10 border-t border-gray-200'>
              {isRecording ? (
                <div className='flex-1 flex items-center justify-between bg-white rounded-full px-6 py-3 shadow-md border border-red-100 mx-2'>
                  <div className='flex items-center gap-3'><div className='w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse'/><span className='text-red-500 font-bold'>Recording: {recordingDuration}s</span></div>
                  <button onClick={stopRecording} className='text-red-500 bg-red-50 p-2 rounded-full'><Square className='w-5 h-5 fill-current'/></button>
                </div>
              ) : (
                <>
                  <div className='flex gap-3 px-2 text-gray-500'>
                    <Smile className='w-6 h-6 cursor-pointer'/>
                    <label className='cursor-pointer'><Paperclip className='w-6 h-6'/><input type='file' className='hidden' accept='image/*,video/*' onChange={handleFileUpload}/></label>
                  </div>
                  <form onSubmit={handleSendMessage} className='flex-1 flex items-center mx-2'>
                    <input type='text' placeholder='Type a message' className='w-full bg-white rounded-xl px-4 py-3 outline-none shadow-sm text-sm' value={inputText} onChange={e=>handleTyping(e.target.value)}/>
                    {inputText.trim() ? <button type='submit' className='ml-3 bg-[#008751] text-white p-3 rounded-full hover:bg-[#006b40] shadow-lg'><Send className='w-5 h-5 fill-current'/></button> : <button type='button' onClick={startRecording} className='ml-3 text-gray-500 p-2 rounded-full'><Mic className='w-7 h-7'/></button>}
                  </form>
                </>
              )}
            </div>
          </>
        ) : (
          <div className='flex-1 flex flex-col items-center justify-center p-12 text-center'>
            <div className='w-28 h-28 bg-gray-100 rounded-full flex items-center justify-center mb-6 opacity-40'><MessageSquare className='w-14 h-14 text-gray-400'/></div>
            <h2 className='text-2xl font-light text-gray-600 mb-3'>Select a chat to start messaging</h2>
            <p className='text-gray-400 text-sm max-w-xs'>Send and receive messages, photos, videos and voice notes.</p>
            <div className='flex items-center gap-2 text-xs text-gray-400 mt-6'><CheckCheck className='w-4 h-4'/> End-to-end encrypted</div>
            <p className='mt-8 text-[10px] text-gray-300'>Designed by Thompson Obosa</p>
          </div>
        )}
      </div>
      <AnimatePresence>
        {showNewChat && (
          <motion.div key='nc' initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className='fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4' onClick={()=>setShowNewChat(false)}>
            <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className='bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl' onClick={e=>e.stopPropagation()}>
              <h2 className='text-lg font-bold mb-4'>New Chat</h2>
              <form onSubmit={handleStartNewChat} className='space-y-3'>
                <input type='tel' placeholder='Phone e.g. +2348012345678' className='w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751]' value={newChatNumber} onChange={e=>setNewChatNumber(e.target.value)} autoFocus/>
                <div className='flex gap-2'>
                  <button type='button' onClick={()=>setShowNewChat(false)} className='flex-1 py-2 rounded-xl border border-gray-200 text-gray-600'>Cancel</button>
                  <button type='submit' className='flex-1 py-2 rounded-xl bg-[#008751] text-white font-semibold'>Start Chat</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        {showGroupModal && (
          <motion.div key='gm' initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className='fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4' onClick={()=>setShowGroupModal(false)}>
            <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className='bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl' onClick={e=>e.stopPropagation()}>
              <h2 className='text-lg font-bold mb-4'>Create Group</h2>
              <form onSubmit={handleCreateGroup} className='space-y-3'>
                <input type='text' placeholder='Group name' className='w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008751]' value={groupName} onChange={e=>setGroupName(e.target.value)} autoFocus/>
                <div className='flex gap-2'>
                  <button type='button' onClick={()=>setShowGroupModal(false)} className='flex-1 py-2 rounded-xl border border-gray-200 text-gray-600'>Cancel</button>
                  <button type='submit' className='flex-1 py-2 rounded-xl bg-[#008751] text-white font-semibold'>Create</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        {showSettings && (
          <motion.div key='st' initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className='fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4' onClick={()=>setShowSettings(false)}>
            <motion.div initial={{scale:0.95,y:20}} animate={{scale:1,y:0}} exit={{scale:0.95,y:20}} className='bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]' onClick={e=>e.stopPropagation()}>
              <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
                <h2 className='text-lg font-bold'>Settings</h2>
                <button onClick={()=>setShowSettings(false)}><X className='w-5 h-5 text-gray-500'/></button>
              </div>
              <div className='flex border-b border-gray-100'>
                {(['account','privacy','notifications','backup']).map(tab=>(
                  <button key={tab} onClick={()=>setActiveSettingsTab(tab as any)} className={'flex-1 py-3 text-sm font-medium capitalize ' + (activeSettingsTab===tab ? 'text-[#008751] border-b-2 border-[#008751]' : 'text-gray-500')}>{tab}</button>
                ))}
              </div>
              <div className='flex-1 overflow-y-auto p-6 space-y-5'>
                {activeSettingsTab==='account' && (
                  <div className='space-y-5'>
                    <div className='flex items-center gap-4'>
                      <div className='relative w-20 h-20 rounded-full overflow-hidden bg-gray-200'>
                        <img src={userProfile?.avatarUrl || ('https://i.pravatar.cc/150?u=' + userId)} className='w-full h-full object-cover'/>
                        <label className='absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer'><Paperclip className='text-white w-5 h-5'/><input type='file' className='hidden' accept='image/*' onChange={handleAvatarUpload}/></label>
                      </div>
                      <div className='flex-1'>
                        <label className='text-xs font-bold text-gray-400 uppercase'>Name</label>
                        <input type='text' defaultValue={userProfile?.username||''} onBlur={e=>handleUpdateProfile({username:e.target.value})} className='w-full text-lg font-semibold outline-none border-b-2 border-transparent focus:border-[#008751] pb-1 mt-1'/>
                      </div>
                    </div>
                    <div><label className='text-xs font-bold text-gray-400 uppercase'>Phone</label><p className='text-gray-700 mt-1'>{userProfile?.phoneNumber}</p></div>
                    <div><label className='text-xs font-bold text-gray-400 uppercase'>Email</label><input type='email' defaultValue={userProfile?.email||''} onBlur={e=>handleUpdateProfile({email:e.target.value})} placeholder='email@example.com' className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mt-1 outline-none focus:ring-2 focus:ring-[#008751]'/></div>
                  </div>
                )}
                {activeSettingsTab==='privacy' && (
                  <div className='space-y-5'>
                    {[{id:'readReceipts',label:'Read Receipts',desc:'Show when you have read messages'},{id:'lastSeenStatus',label:'Last Seen',desc:'Show your last seen time'},{id:'screenshotProtection',label:'Privacy Mode',desc:'Blur content when app loses focus'}].map(item=>(
                      <div key={item.id} className='flex items-center justify-between'>
                        <div><p className='font-medium text-gray-700'>{item.label}</p><p className='text-sm text-gray-400'>{item.desc}</p></div>
                        <div onClick={()=>handleUpdateProfile({[item.id]:userProfile?.[item.id]?0:1})} className={'w-12 h-6 rounded-full cursor-pointer transition-colors relative ' + (userProfile?.[item.id] ? 'bg-[#008751]' : 'bg-gray-300')}>
                          <div className={'absolute top-1 w-4 h-4 rounded-full bg-white transition-all ' + (userProfile?.[item.id] ? 'left-7' : 'left-1')}/>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeSettingsTab==='notifications' && (
                  <div className='flex items-center justify-between'>
                    <div><p className='font-medium text-gray-700'>Push Notifications</p><p className='text-sm text-gray-400'>Receive message notifications</p></div>
                    <div onClick={()=>handleUpdateProfile({pushEnabled:userProfile?.pushEnabled?0:1})} className={'w-12 h-6 rounded-full cursor-pointer transition-colors relative ' + (userProfile?.pushEnabled ? 'bg-[#008751]' : 'bg-gray-300')}>
                      <div className={'absolute top-1 w-4 h-4 rounded-full bg-white transition-all ' + (userProfile?.pushEnabled ? 'left-7' : 'left-1')}/>
                    </div>
                  </div>
                )}
                {activeSettingsTab==='backup' && (
                  <div className='bg-gray-50 rounded-2xl p-5'>
                    <p className='font-bold text-gray-700 mb-2'>Chat Backup</p>
                    <p className='text-sm text-gray-500 mb-4'>Messages stored securely in Firebase. No manual backup needed.</p>
                    <div className='flex items-center gap-2 text-[#008751]'><CheckCheck className='w-4 h-4'/><span className='text-sm font-medium'>Auto-synced to Firebase</span></div>
                  </div>
                )}
              </div>
              <div className='px-6 py-3 border-t border-gray-100 text-center'><p className='text-[9px] text-gray-300'>9jaTalk v1.2 - Designed by Thompson Obosa</p></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
`;
fs.writeFileSync('src/App.tsx', ui, 'utf8');
console.log('Written', ui.split('\n').length, 'lines');
