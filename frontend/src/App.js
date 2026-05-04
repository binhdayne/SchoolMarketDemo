import React, { useState, useEffect } from "react";
import axios from "axios";
import AuthForm from "./components/AuthForm";

const API = "http://localhost:5000/api";

function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [role, setRole] = useState(() => {
    const t = localStorage.getItem("token");
    return t ? decodeToken(t)?.role : null;
  });
  const [posts, setPosts] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    type: "sell"
  });

  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/posts`)
      .then(res => setPosts(res.data))
      .catch(err => console.error(err));

    if (role === "admin") {
      axios.get(`${API}/posts/pending`, {
        headers: { Authorization: token }
      })
        .then(res => setPendingPosts(res.data))
        .catch(err => console.error(err));
    }
  }, [token, role]);

  const handleLoginSuccess = (newToken) => {
    const decoded = decodeToken(newToken);
    setToken(newToken);
    setRole(decoded?.role || "user");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setRole(null);
    setPosts([]);
    setPendingPosts([]);
  };

  const createPost = async () => {
    try {
      await axios.post(`${API}/posts`, form, {
        headers: { Authorization: token }
      });
      alert("Đã đăng bài!");
    } catch (err) {
      console.error(err);
      alert("Lỗi tạo bài");
    }
  };

  const approvePost = async (id) => {
    try {
      await axios.put(`${API}/posts/approve/${id}`, {}, {
        headers: { Authorization: token }
      });
      setPendingPosts(prev => prev.filter(p => p.id !== id));
      alert("Đã duyệt bài!");
    } catch (err) {
      console.error(err);
      alert("Lỗi duyệt bài");
    }
  };

  const rejectPost = async (id) => {
    try {
      await axios.put(`${API}/posts/reject/${id}`, {}, {
        headers: { Authorization: token }
      });
      setPendingPosts(prev => prev.filter(p => p.id !== id));
      alert("Đã từ chối bài!");
    } catch (err) {
      console.error(err);
      alert("Lỗi từ chối bài");
    }
  };

  if (!token) {
    return <AuthForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>School Marketplace</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, color: "#555" }}>
            Vai trò: <strong>{role === "admin" ? "Admin" : "Người dùng"}</strong>
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              backgroundColor: "#ff4d4f",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Admin: duyệt bài */}
      {role === "admin" && (
        <div style={{ marginTop: 20 }}>
          <h2>Bài chờ duyệt ({pendingPosts.length})</h2>
          {pendingPosts.length === 0 ? (
            <p>Không có bài nào chờ duyệt.</p>
          ) : (
            pendingPosts.map(p => (
              <div
                key={p.id}
                style={{
                  border: "1px solid #faad14",
                  borderRadius: 6,
                  padding: 12,
                  margin: "10px 0",
                  backgroundColor: "#fffbe6"
                }}
              >
                <h3 style={{ margin: "0 0 4px" }}>{p.title}</h3>
                <p style={{ margin: "0 0 8px", color: "#555" }}>{p.description}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => approvePost(p.id)}
                    style={{
                      padding: "6px 14px",
                      backgroundColor: "#52c41a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer"
                    }}
                  >
                    Duyệt
                  </button>
                  <button
                    onClick={() => rejectPost(p.id)}
                    style={{
                      padding: "6px 14px",
                      backgroundColor: "#ff4d4f",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer"
                    }}
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* User: đăng bài */}
      {role !== "admin" && (
        <div style={{ marginTop: 20 }}>
          <h2>Tạo bài</h2>
          <input placeholder="Title" onChange={e => setForm({...form, title: e.target.value})} />
          <br /><br />
          <input placeholder="Description" onChange={e => setForm({...form, description: e.target.value})} />
          <br /><br />
          <input placeholder="Price" onChange={e => setForm({...form, price: e.target.value})} />
          <br /><br />
          <button onClick={createPost}>Đăng</button>
        </div>
      )}

      <h2 style={{ marginTop: 30 }}>Danh sách bài đã duyệt</h2>
      {posts.length === 0 ? (
        <p>Chưa có bài nào</p>
      ) : (
        posts.map(p => (
          <div key={p.id} style={{ border: "1px solid #d9d9d9", borderRadius: 6, margin: 10, padding: 12 }}>
            <h3 style={{ margin: "0 0 4px" }}>{p.title}</h3>
            <p style={{ margin: 0, color: "#555" }}>{p.description}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default App;