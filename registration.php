<?php
// registration.php
require_once 'config.php';

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // ইনপুট নিরাপদভাবে নিন
    $username = trim($_POST['username'] ?? '');
    $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $password = $_POST['password'] ?? '';
    $password2 = $_POST['password2'] ?? '';

    if (!$username) $errors[] = "একটি valid username দিন।";
    if (!$email) $errors[] = "সঠিক ইমেইল দিন।";
    if (strlen($password) < 6) $errors[] = "পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে।";
    if ($password !== $password2) $errors[] = "পাসওয়ার্ড মিলেছে না।";

    if (empty($errors)) {
        // চেক করুন email/username আগেই আছে কি না
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email OR username = :username LIMIT 1");
        $stmt->execute([':email' => $email, ':username' => $username]);
        if ($stmt->fetch()) {
            $errors[] = "Username বা Email ইতোমধ্যেই ব্যবহার করা হয়েছে।";
        } else {
            // password hash করে ইনসার্ট
            $password_hash = password_hash($password, PASSWORD_DEFAULT);
            $ins = $pdo->prepare("INSERT INTO users (username, email, password_hash, created_at) VALUES (:u, :e, :p, NOW())");
            $ins->execute([':u' => $username, ':e' => $email, ':p' => $password_hash]);
            // রেজিস্ট্রেশন সফল হলে লগইন বা রিডাইরেক্ট করান
            $_SESSION['user_id'] = $pdo->lastInsertId();
            $_SESSION['username'] = $username;
            header('Location: dashboard.php'); // আপনার ড্যাশবোর্ড পেজ (প্রয়োজনে বদলে নিন)
            exit;
        }
    }
}
?>
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Register - Plabon Gaming Top-Up</title>
</head>
<body>
<h2>রেজিস্ট্রেশন</h2>

<?php if (!empty($errors)): ?>
    <div style="color:red;">
        <ul><?php foreach($errors as $e) echo "<li>".htmlspecialchars($e)."</li>"; ?></ul>
    </div>
<?php endif; ?>

<form method="post" action="">
    <label>Username: <input type="text" name="username" value="<?php echo htmlspecialchars($username ?? ''); ?>"></label><br>
    <label>Email: <input type="email" name="email" value="<?php echo htmlspecialchars($email ?? ''); ?>"></label><br>
    <label>Password: <input type="password" name="password"></label><br>
    <label>Confirm Password: <input type="password" name="password2"></label><br>
    <button type="submit">Register</button>
</form>

<p>Already have an account? <a href="login.php">Login</a></p>
</body>
</html>
