NAME = ft_transcendence
GREEN = \033[0;32m
YELLOW = \033[0;33m
RED = \033[0;31m
BLUE = \033[0;34m
RESET = \033[0m

COMPOSE = docker-compose.yml
CONTAINERS = frontend nginx
VOLUMES = frontend_dist
NETWORK = transcendence_network

.PHONY: all up build down restart logs clean fclean re status help

all: up

up:
	@echo "$(BLUE)🚀 Starting $(NAME)...$(RESET)"
	@mkdir -p backend/uploads/avatars
	@touch backend/uploads/avatars/.gitkeep
	@docker compose -f $(COMPOSE) up -d --build
	@echo "$(GREEN)✅ $(NAME) is running!$(RESET)"
	@echo "$(YELLOW)📱 Access the application at: https://localhost$(RESET)"

build:
	@echo "$(BLUE)🔨 Building $(NAME) containers...$(RESET)"
	@docker compose -f $(COMPOSE) build
	@echo "$(GREEN)✅ Build complete!$(RESET)"

down:
	@echo "$(YELLOW)🛑 Stopping $(NAME)...$(RESET)"
	@docker compose -f $(COMPOSE) down
	@echo "$(GREEN)✅ $(NAME) stopped!$(RESET)"

restart: down up

logs:
	@docker compose -f $(COMPOSE) logs -f

logs-frontend:
	@docker compose -f $(COMPOSE) logs -f frontend

logs-nginx:
	@docker compose -f $(COMPOSE) logs -f nginx

clean:
	@echo "$(YELLOW)🧹 Cleaning $(NAME)...$(RESET)"
	@docker compose -f $(COMPOSE) down -v
	@echo "$(GREEN)✅ Containers and volumes removed!$(RESET)"

fclean:
	@echo "$(RED)🧹 Performing deep clean...$(RESET)"
	@docker compose -f $(COMPOSE) down -v
	@docker system prune -af --volumes
	@rm -rf backend/uploads
	@rm -rf data/*.db*
	@echo "$(GREEN)✨ Deep clean complete!$(RESET)"

re: fclean up

status:
	@echo "$(BLUE)📊 Container Status:$(RESET)"
	@docker compose -f $(COMPOSE) ps

shell-frontend:
	@docker exec -it frontend bash

shell-nginx:
	@docker exec -it nginx bash

build-frontend:
	@echo "$(BLUE)🔨 Building frontend...$(RESET)"
	@docker exec -it frontend npm run build
	@echo "$(GREEN)✅ Frontend build complete!$(RESET)"

install-frontend:
	@echo "$(BLUE)📦 Installing frontend dependencies...$(RESET)"
	@docker exec -it frontend npm install
	@echo "$(GREEN)✅ Dependencies installed!$(RESET)"

check-frontend:
	@echo "$(BLUE)🔍 Checking frontend for errors...$(RESET)"
	@docker exec -it frontend npx tsc --noEmit

help:
	@echo "$(BLUE)╔══════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(BLUE)║         $(NAME) - Makefile Help                    ║$(RESET)"
	@echo "$(BLUE)╚══════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(GREEN)Main commands:$(RESET)"
	@echo "  $(YELLOW)make$(RESET) or $(YELLOW)make up$(RESET)       - Build and start all containers"
	@echo "  $(YELLOW)make down$(RESET)              - Stop all containers"
	@echo "  $(YELLOW)make restart$(RESET)           - Restart all containers"
	@echo "  $(YELLOW)make clean$(RESET)             - Stop containers and remove volumes"
	@echo "  $(YELLOW)make fclean$(RESET)            - Deep clean (remove everything)"
	@echo "  $(YELLOW)make re$(RESET)                - Rebuild everything from scratch"
	@echo ""
	@echo "$(GREEN)Development commands:$(RESET)"
	@echo "  $(YELLOW)make logs$(RESET)              - View all container logs"
	@echo "  $(YELLOW)make logs-frontend$(RESET)     - View frontend logs"
	@echo "  $(YELLOW)make logs-nginx$(RESET)        - View nginx logs"
	@echo "  $(YELLOW)make status$(RESET)            - Show container status"
	@echo "  $(YELLOW)make shell-frontend$(RESET)    - Enter frontend container shell"
	@echo "  $(YELLOW)make shell-nginx$(RESET)       - Enter nginx container shell"
	@echo ""
	@echo "$(GREEN)Build commands:$(RESET)"
	@echo "  $(YELLOW)make build$(RESET)             - Build containers without starting"
	@echo "  $(YELLOW)make build-frontend$(RESET)    - Build frontend inside container"
	@echo "  $(YELLOW)make install-frontend$(RESET)  - Install frontend dependencies"
	@echo "  $(YELLOW)make check-frontend$(RESET)    - Check frontend for TypeScript errors"
	@echo ""
	@echo "$(BLUE)📱 Application URL: https://localhost$(RESET)"
	@echo ""