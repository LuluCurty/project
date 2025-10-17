def studentInputScore(): # Função para salvar o input do usuario e trata-lo
  try: 
    score = float(input("Digite a nota do aluno:"))

    if 0 <= score <=10:
      return score

    else:
      print("Nota invalida")
      return None # Deixa o codigo mais pythonico
      
  except Exception as error: #tratamento de erro
    print("Error ao tentar salvar a nota", error)
    return False


def studentMedianScore(stundentScoreList): # Função apenas para calcular a média
  try:
    scoreList = stundentScoreList
    if len(scoreList) == 0: # Esta parte já foi tratada antes de entrar aqui
      return None           # Em caso de outro colaborador não tratar este erro
                            # ()"scoreList" vazia) já existe um tratamento aqui
    else:
      return sum(scoreList) / len(scoreList)
      
  except Exception as error: #tratamento de erro
    print("Erro calcular a media das notas", error)
    return False


def stundentApproval(median): # Função apenas para verificar o estado atual                        
  try:                        # do estudante, evidenciado pelo parametro
    media = median
    if media < 7:
      return "Reprovado"
    else:
      return "Aprovado"
  except Exception as error: #tratamento de erro
    print("Erro ao mostrar a situação do aluno", error)
    return False


def stundentScoreSystem():
  try:
    scoreList = []
    while True:
      print("""
      Digite o digito para continuar:
      [1] Para adicionar uma nova nota a lista de notas do estudante
      [2] Para mostrar a situação do estudante
      [3] Para limpar as notas
      [4] Para mostrar a lista
      [S] Para sair
      """)
      controlChar = input(">>> ").strip() # Só pra ficar bonitinho, ele quebra
                                          # A linha onde tiver caracter vazio .
      if controlChar.lower() == 's':
        print("Saindo...")
        break

      elif controlChar == '1':
        print("Digite uma nota para adicionar ao estudante")
        score = studentInputScore()
        if score is not None: # Se não for None ele continua
          scoreList.append(score)

      elif controlChar == '2':
        if len(scoreList) == 0:
          print("Nenhuma nota adicionada ainda")

        else:
          media = studentMedianScore(scoreList) # Deixar o codigo pythonico
          print(f"""
          ////////////SITUAÇÃO DO ALUNO////////////
          Notas: {scoreList}
          MEDIA: {media}
          SITUAÇÃO: {stundentApproval(media)}
          """)

      elif controlChar == '3':
        scoreList = []
        print("Lista limpa!")
      
      elif controlChar == '4':
        print(f"Lista: {scoreList}")
        
      else:
        print("Favor entrar uma das opções acima!")

  except Exception as error:
    print("Erro geral", error)
    return False