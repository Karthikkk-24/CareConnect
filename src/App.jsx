import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Main from './pages/Main';
import PatientData from './pages/PatientData';
import PublicRoute from './pages/PublicRoute';
import Register from './pages/Register';

function App() {
    return (
        <>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/patient-form" element={<PatientData />} />
                    <Route path="/" element={<Main />} />
                    <Route path="/" element={<PublicRoute />} />
                </Routes>
            </Router>
        </>
    );
}

export default App;
