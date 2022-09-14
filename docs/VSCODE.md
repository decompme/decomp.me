### Configuring vscode for development

Poetry creates a virtualenv where packages for the site are installed. You can set your python interpreter path in vscode to use this virtualenv's interpreter, which will allow a much nicer backend development experience.

1. Inside the `backend/` directory, run `poetry debug` and copy the "Path:" property under the "Virtualenv" category.
<img width="580" alt="image" src="https://user-images.githubusercontent.com/2985314/190146150-4ac8ecdd-dcfa-4e8e-a8b2-4913044aa088.png">

In vscode, open the command window (Ctrl+Shift+P on Windows, Cmd+Shift+P on MacOS) and type "Python: Select Interpreter" and choose the command as it appears.
<img width="454" alt="image" src="https://user-images.githubusercontent.com/2985314/190146241-9df7da65-9425-465c-9143-c7a8afeb4e53.png">

3. Click `Enter interpreter path...` and paste your copied path from before.
<img width="459" alt="image" src="https://user-images.githubusercontent.com/2985314/190146308-bd4559a8-8587-4896-93a2-64f48ff50b76.png">
