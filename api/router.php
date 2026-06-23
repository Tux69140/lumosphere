<?php

declare(strict_types=1);

function route(PDO $pdo, array $ctx): void
{
    $method = $_SERVER['REQUEST_METHOD'];
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

    // Strip /api/ prefix
    $path = preg_replace('#^/api/#', '', $uri);
    $segments = explode('/', trim($path, '/'));
    $resource = $segments[0] ?? '';
    if (isset($segments[1]) && ctype_digit($segments[1])) {
        $id = (int) $segments[1];
        $action = $segments[2] ?? null;
    } else {
        $action = $segments[1] ?? null;
        $id = isset($segments[2]) && ctype_digit($segments[2]) ? (int) $segments[2] : null;
    }

    $endpoint_file = __DIR__ . '/endpoints/' . $resource . '.php';
    if ($resource === '' || !file_exists($endpoint_file)) {
        http_response_code(404);
        echo json_encode(dal_error('Ressource introuvable.'));
        return;
    }

    require_once $endpoint_file;
    $handler = "endpoint_{$resource}";
    if (!function_exists($handler)) {
        http_response_code(404);
        echo json_encode(dal_error('Ressource introuvable.'));
        return;
    }

    $body = null;
    if (in_array($method, ['POST', 'PUT'], true)) {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
    }

    try {
        $result = $handler($pdo, $ctx, $method, $id, $body, $action);
        echo json_encode($result);
    } catch (RuntimeException $e) {
        http_response_code(403);
        echo json_encode(dal_error($e->getMessage()));
    } catch (\Throwable $e) {
        http_response_code(500);
        echo json_encode(dal_error('Erreur interne du serveur.'));
    }
}
