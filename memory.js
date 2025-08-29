export function newMemory(callSid){
  const msgs = [];
  return {
    addUser: (t)=> msgs.push({role:"user", content:t}),
    history: (lastUser)=> [
      ...msgs.slice(-6), // 只帶近期避免貴
      {role:"user", content:lastUser}
    ]
  };
}
