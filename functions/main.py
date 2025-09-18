import functions_framework

@functions_framework.http
def flask_app(request):
    return "✅ ¡Firebase Functions funciona! " + str(request.path)