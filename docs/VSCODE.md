### Configuring vscode for development

Poetry creates a virtualenv where packages for the site are installed. You can set your python interpreter path in vscode to use this virtualenv's interpreter, which will allow a much nicer backend development experience.

1. Inside the `backend/` directory, run `poetry debug` and copy the "Path:" property under the "Virtualenv" category.

2. In vscode, open the command window (ctrl+P on Windows) and type ">Python: select interpreter" and choose the command as it appears.

3. Click `Enter interpreter path...` and paste your copied path from before.
