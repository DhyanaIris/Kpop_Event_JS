const express = require('express');
const router = express.Router();
const fs = require('fs');
const uuid = require('uuid');
const bcrypt = require('bcrypt')
const requireAuth = require('../middlewares/authenticator');

// Rota para exibir o formulário de cadastro de usuário
router.get("/signup", requireAuth, (req, res) => {
  let user = req.session.user;
  res.render("signup", { user }); 
});

// Rota para lidar com o envio do formulário de cadastro de usuário
router.post("/signup", requireAuth, async (req, res) => {
  // Receba os dados do formulário
  const novoUsuario = req.body;

  // Define o valor de "author_level" com base no estado do checkbox "admin"
  novoUsuario.author_level = req.body.admin === "admin" ? "admin" : "user";
  novoUsuario.author_status = "on";

  // Gera um ID único para o novo usuário
  novoUsuario.author_id = uuid.v4();

  // Hash da senha
  const hashedPassword = await hashPassword(novoUsuario.author_pwd);
  novoUsuario.author_pwd = hashedPassword;
  
  // Verifica se o arquivo JSON de usuários existe
  if (fs.existsSync("./data/users.json")) {
    try {
      const data = fs.readFileSync("./data/users.json", "utf8");
      users = JSON.parse(data);

      // Verifica se já existe um usuário com o mesmo "author_user"
      const usuarioExistente = users.find((user) => user.author_user === novoUsuario.author_user);

      if (usuarioExistente) {
        // Se um usuário com o mesmo "author_user" já existe, retorne um erro ou redirecione para uma página de erro
        return res.status(400).send("Esse nome de usuário já existe");
      }

    } catch (error) {
      console.error("Erro ao analisar o arquivo JSON de usuários:", error);
    }
  }

   // Ordena as propriedades do novo usuário
   const usuarioOrdenado = ordenarPropsUsuario(novoUsuario);

  // Adiciona o novo usuário à lista de usuários
  users.push(usuarioOrdenado);

  // Salva a lista de usuários no arquivo JSON
  fs.writeFileSync("./data/users.json", JSON.stringify(users, null, 2));

  // Redireciona de volta para a página de cadastro de usuário
  res.redirect("/users/signup");
  
});


// Rota para exibir a página de edição de usuário
router.get('/edit/:author_id', requireAuth, (req, res) => {
  let user = req.session.user;
  const authorId = req.params.author_id;

  // Lê o arquivo JSON de usuários
  fs.readFile("./data/users.json", "utf8", (err, data) => {
    if (err) {
      console.error("Erro ao ler o arquivo JSON de usuários:", err);
      res.status(500).send("Erro interno do servidor");
      return;
    }
    
    try {
      // Analisa o arquivo JSON em um array de objetos de usuário
      const users = JSON.parse(data);
      
      // Encontra o usuário com base no ID
      const author = users.find((author) => author.author_id === authorId);

      if (!user) {
        res.status(404).send("Usuário não encontrado");
        return;
      }

      // Verifica o nível de autorização do usuário autenticado
      if (user.author_level === "admin") {

        let senha = author.author_pwd;

        // Renderiza a página de edição de usuário apenas se o usuário for "admin"
        res.render('editUser', { author,senha, user });
      } else {
      // Se o usuário não for "admin", exibe uma mensagem de erro
      res.status(403).send("Permissão negada.");
      }
      
    } catch (error) {
      console.error("Erro ao analisar o arquivo JSON de usuários:", error);
      res.status(500).send("Erro interno do servidor");
    }
  });
});

// Rota para lidar com a atualização do usuário
router.post("/edit/:author_id", async (req, res) => {
  const authorId = req.params.author_id;
  const updatedUser = req.body;
  
  // Lê o arquivo JSON de usuários
  fs.readFile("./data/users.json", "utf8", async(err, data) => {
    if (err) {
      console.error("Erro ao ler o arquivo JSON de usuários:", err);
      res.status(500).send("Erro interno do servidor");
      return;
    }
    
    try {
      // Analisa o arquivo JSON em um array de objetos de usuário
      const users = JSON.parse(data);
      
      // Encontra o índice do usuário com base no ID
      const userIndex = users.findIndex((user) => user.author_id === authorId);
      
      if (userIndex === -1) {
        res.status(404).send("Usuário não encontrado");
        return;
      }
      
      // Obtém o usuário encontrado no índice
      const foundUser = users[userIndex];

      // Atualiza apenas as propriedades especificadas no formulário de edição
      foundUser.author_id = updatedUser.author_id || foundUser.author_id;
      foundUser.author_name = updatedUser.author_name || foundUser.author_name;
      foundUser.author_email = updatedUser.author_email || foundUser.author_email;
      foundUser.author_user = updatedUser.author_user || foundUser.author_user;
      foundUser.author_pwd = updatedUser.author_pwd || foundUser.author_pwd;

      // Verifica se a nova senha foi fornecida e a criptografa
      if (updatedUser.author_pwd) {
        const hashedPassword = await hashPassword(updatedUser.author_pwd);
        foundUser.author_pwd = hashedPassword;
      }
      
      // Verifica se o checkbox "Admin" está marcado ou não
      if (req.body.author_level === "admin") {
        foundUser.author_level = "admin"; // Se estiver marcado, define como "admin"
      } else {
        foundUser.author_level = "user"; // Se não estiver marcado, define como "user"
      }

      // Verifica se o checkbox "Ativo" está marcado ou não
      if (updatedUser.author_status === "on") {
        foundUser.author_status = "on"; // Se estiver marcado, define como "on"
      } else {
        foundUser.author_status = "off"; // Se não estiver marcado, define como "off"
      }
      
      // Salva o array de usuários de volta no arquivo JSON
      fs.writeFile("./data/users.json", JSON.stringify(users, null, 2), (err) => {
        if (err) {
          console.error("Erro ao salvar o arquivo JSON de usuários:", err);
          res.status(500).send("Erro interno do servidor");
          return;
        }
        
        // Redireciona de volta para a página de admin ou para onde desejar
        res.redirect("/admin");
      });
    } catch (error) {
      console.error("Erro ao analisar o arquivo JSON de usuários:", error);
      res.status(500).send("Erro interno do servidor");
    }
  });
});

// Função para gerar um hash de senha
async function hashPassword(password) {
  const saltRounds = 10; // Número de saltos a serem usados
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}


function ordenarPropsUsuario(obj) {
    const objOrdenado = {};
    objOrdenado.author_id = obj.author_id;
    objOrdenado.author_name = obj.author_name;
    objOrdenado.author_email = obj.author_email;
    objOrdenado.author_user = obj.author_user;
    objOrdenado.author_pwd = obj.author_pwd;
    objOrdenado.author_level = obj.author_level;
    objOrdenado.author_status = obj.author_status;
    return objOrdenado;
}



module.exports = router;
