import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/common/Layout';
import { checkAndResetTasks } from '../../utils/taskResetLogic';

const MyTasks = () => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('All'); // All | Daily | Weekly | Monthly | Pending | Completed

  useEffect(() => {
    fetchTasks();
  }, [currentUser]);

  const fetchTasks = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await checkAndResetTasks();
      
      const tasksRef = collection(db, 'tasks');
      const q = query(
        tasksRef, 
        where('assignedTo', '==', currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      const tasksList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Firestore composite index might be needed if we combine where and orderBy, so we sort client side.
      tasksList.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
      
      setTasks(tasksList);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsDone = async (id) => {
    try {
      await updateDoc(doc(db, 'tasks', id), {
        status: 'completed',
        completedAt: Timestamp.fromDate(new Date()),
        completedBy: currentUser.uid
      });
      fetchTasks();
    } catch (error) {
      console.error('Error marking task as done:', error);
    }
  };

  const getTimeDeltaText = (targetDate) => {
    if (!targetDate) return '';
    const date = targetDate instanceof Date ? targetDate : (targetDate?.toDate ? targetDate.toDate() : new Date(targetDate));
    if (Number.isNaN(date.getTime())) return '';
    
    const diffMs = date.getTime() - new Date().getTime();
    const isOverdue = diffMs < 0;
    const absMs = Math.abs(diffMs);
    
    const days = Math.floor(absMs / 86400000);
    const hours = Math.floor((absMs % 86400000) / 3600000);
    
    if (isOverdue) {
      if (days > 0) return `Overdue by ${days} day${days > 1 ? 's' : ''}`;
      return `Overdue by ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      if (days === 1) return `Due tomorrow`;
      if (days > 1) return `Due in ${days} days`;
      if (hours > 0) return `Due in ${hours} hour${hours > 1 ? 's' : ''}`;
      return 'Due very soon';
    }
  };

  const isOverdue = (targetDate) => {
    const date = targetDate instanceof Date ? targetDate : (targetDate?.toDate ? targetDate.toDate() : new Date(targetDate));
    return date.getTime() < new Date().getTime();
  };

  const filteredTasks = tasks.filter(task => {
    if (filterTab === 'All') return true;
    if (filterTab === 'Pending') return task.status === 'pending';
    if (filterTab === 'Completed') return task.status === 'completed';
    return task.frequency.toLowerCase() === filterTab.toLowerCase();
  });

  const getPriorityColor = (priority) => {
    if (priority === 'high') return 'bg-red-100 text-red-800 border-red-200';
    if (priority === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  return (
    <Layout title="My Tasks">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your routines and to-dos.</p>
      </div>

      <div className="flex overflow-x-auto pb-4 hide-scrollbar w-full gap-2 mb-4">
        {['All', 'Daily', 'Weekly', 'Monthly', 'Pending', 'Completed'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${filterTab === tab ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 bg-white border border-gray-200'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center p-8 text-gray-500">Loading your tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500">
          No tasks found for the selected filter.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map(task => {
            const dueDateText = getTimeDeltaText(task.dueDate);
            const overdue = task.status === 'pending' && isOverdue(task.dueDate);
            return (
              <div key={task.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-bold text-gray-900 leading-tight">{task.title}</h3>
                  <span className={`shrink-0 px-2.5 py-0.5 rounded border text-[10px] uppercase font-bold tracking-wider ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                
                {task.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{task.description}</p>
                )}
                
                <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600 capitalize`}>
                      {task.frequency}
                    </span>
                    {task.status === 'pending' ? (
                      <span className={`text-xs font-semibold ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                        {dueDateText}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                        Completed ✓
                      </span>
                    )}
                  </div>
                  
                  {task.status === 'pending' && (
                    <button
                      onClick={() => handleMarkAsDone(task.id)}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-sm transition-colors"
                    >
                      Mark as Done
                    </button>
                  )}
                  {task.status === 'completed' && task.completedAt && (
                    <div className="text-center text-xs text-gray-400">
                      Done at {task.completedAt.toDate().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default MyTasks;
