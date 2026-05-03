import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/common/Layout';
import { checkAndResetTasks } from '../../utils/taskResetLogic';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';

const TaskManagement = () => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('All Tasks');
  const [filterStaff, setFilterStaff] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    frequency: 'daily',
    priority: 'medium',
    dueDate: ''
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await checkAndResetTasks();
      
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const tasksList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasks(tasksList);
      
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      const staffList = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.role === 'staff' && u.isActive !== false);
      setStaff(staffList);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateResetDate = (dueDateStr, frequency) => {
    const dueDate = new Date(dueDateStr);
    if (frequency === 'one-time') return dueDate;
    
    const d = new Date(dueDate);
    if (frequency === 'daily') {
      d.setDate(d.getDate() + 1);
    } else if (frequency === 'weekly') {
      d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
    } else if (frequency === 'monthly') {
      d.setMonth(d.getMonth() + 1);
      d.setDate(1);
    }
    return d;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.assignedTo || !formData.dueDate) return;

    const assignedStaff = staff.find(s => s.id === formData.assignedTo);
    const dueDate = new Date(formData.dueDate);
    const resetDate = calculateResetDate(formData.dueDate, formData.frequency);

    const taskData = {
      title: formData.title,
      description: formData.description,
      assignedTo: formData.assignedTo,
      assignedToName: assignedStaff ? assignedStaff.name || assignedStaff.email : '',
      frequency: formData.frequency,
      priority: formData.priority,
      dueDate: Timestamp.fromDate(dueDate),
      status: 'pending',
      resetDate: Timestamp.fromDate(resetDate)
    };

    try {
      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), taskData);
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...taskData,
          createdBy: currentUser.uid,
          createdAt: Timestamp.fromDate(new Date())
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving task: ", error);
    }
  };

  const handleDelete = async (id) => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'tasks', deleteTarget.id));
      setTasks(prev => prev.filter(t => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setDeleting(false);
    }
  };

  const openModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      const tzOffset = (new Date()).getTimezoneOffset() * 60000;
      const localISOTime = (new Date(task.dueDate.toDate() - tzOffset)).toISOString().slice(0,16);
      setFormData({
        title: task.title,
        description: task.description || '',
        assignedTo: task.assignedTo,
        frequency: task.frequency,
        priority: task.priority,
        dueDate: localISOTime
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        assignedTo: '',
        frequency: 'daily',
        priority: 'medium',
        dueDate: ''
      });
    }
    setIsModalOpen(true);
  };

  const filteredTasks = tasks.filter(task => {
    if (filterTab !== 'All Tasks' && task.frequency.toLowerCase() !== filterTab.toLowerCase()) return false;
    if (filterStaff !== 'All' && task.assignedTo !== filterStaff) return false;
    if (filterStatus !== 'All' && task.status !== filterStatus.toLowerCase()) return false;
    return true;
  });

  const getPriorityColor = (priority) => {
    if (priority === 'high') return 'bg-red-100 text-red-800 border-red-200';
    if (priority === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  return (
    <Layout title="Task Management">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage staff tasks and routines.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          Add New Task
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex overflow-x-auto pb-2 md:pb-0 hide-scrollbar w-full md:w-auto gap-2">
            {['All Tasks', 'Daily', 'Weekly', 'Monthly', 'One-time'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${filterTab === tab ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <select
              value={filterStaff}
              onChange={(e) => setFilterStaff(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
            >
              <option value="All">All Staff</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name || s.email}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No tasks found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th scope="col" className="px-6 py-3">Task Title</th>
                  <th scope="col" className="px-6 py-3">Assigned To</th>
                  <th scope="col" className="px-6 py-3">Frequency</th>
                  <th scope="col" className="px-6 py-3">Priority</th>
                  <th scope="col" className="px-6 py-3">Due Date</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => (
                  <tr key={task.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {task.title}
                      {task.description && <p className="text-xs text-gray-500 font-normal mt-1 truncate max-w-[200px]">{task.description}</p>}
                    </td>
                    <td className="px-6 py-4">{task.assignedToName}</td>
                    <td className="px-6 py-4 capitalize">{task.frequency}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded border text-xs font-medium capitalize ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {task.dueDate?.toDate().toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openModal(task)} className="font-medium text-indigo-600 hover:underline">Edit</button>
                      <button onClick={() => setDeleteTarget(task)} className="font-medium text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">{editingTask ? 'Edit Task' : 'Add New Task'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <form id="taskForm" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-900">Title <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-900">Description</label>
                  <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"></textarea>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-900">Assign To <span className="text-red-500">*</span></label>
                  <select required value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5">
                    <option value="">Select Staff</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name || s.email}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-900">Frequency <span className="text-red-500">*</span></label>
                    <select required value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="one-time">One-time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-900">Priority <span className="text-red-500">*</span></label>
                    <select required value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5">
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-900">Due Date & Time <span className="text-red-500">*</span></label>
                  <input type="datetime-local" required value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5" />
                </div>
              </form>
            </div>
            <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-xl">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" form="taskForm" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Save Task</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={deleting}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
      />
    </Layout>
  );
};

export default TaskManagement;
