import inquirer from "inquirer";

inquirer.prompt([
    {
        name: '업데이트할 jar파일 위치',
        type: 'input',
    },
    {
        name: '언어 데이터를 불러올 jar파일 위치',
        type: 'input',
    }
])
