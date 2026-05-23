
# CALCUL OFFSET POUR PAGINATION
def get_pagination_params(page: int = 1, limit: int = 10):

    offset = (page - 1) * limit

    return {
        "limit": limit,
        "offset": offset
    }