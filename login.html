<?php
// login.php
require_once 'config.php';

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $identifier = trim($_POST['identifier'] ?? ''); // email or username
    $password = $_POST['password'] ?? '';

    if (!$identifier) $errors[] = "Username বা Email দিন।";
    if (!$password) $errors[] = "Password দিন।";

    if (empty($errors)) {
        $stmt = $pdo->prepare("SELECT id, username, email, password_hash FROM users WHERE email = :id OR username = :id LIMIT 1");
        $stmt->execute([':id' => $identifier]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password_hash'])) {
            // সফল লগইন
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            header('Location: dashboard.php'); // আপনার ড্যাশবোর্ড বা হোম
            exit;
        } else {
            $errors[] = "ইমেইল/ইউজারনেম বা পাসওয়ার্ড সঠিক নয়।";
        }
    }
}
?>
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Login - Plabon Gaming Top-Up</title>
</head>
<body>
<h2>Login</h2>

<?php if (!empty($errors)): ?>
    <div style="color:red;">
        <ul><?php foreach($errors as $e) echo "<li>".htmlspecialchars($e)."</li>"; ?></ul>
    </div>
<?php endif; ?>

<form method="post" action="">
    <label>Email or Username: <input type="text" name="identifier" value="<?php echo htmlspecialchars($identifier ?? ''); ?>"></label><br>
    <label>Password: <input type="password" name="password"></label><br>
    <button type="submit">Login</button>
</form>

<p>Don't have account? <a href="registration.php">Register</a></p>
</body>
</html>
