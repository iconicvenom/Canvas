import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, name, password);
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 grid-bg">
      <div className="card-surface w-full max-w-md p-8">
        <a href="/" className="mb-6 block text-center font-chewy text-5xl">
          Canvas
        </a>
        <h1 className="mb-6 text-center text-3xl">Start for free</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            required
          />
          <input
            type="password"
            placeholder="Password (6+ chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            minLength={6}
            required
          />
          <button type="submit" disabled={loading} className="btn-primary w-full text-xl">
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-lg">
          Already have an account?{" "}
          <Link to="/login" className="text-canvas-primary underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
